export interface Post {
  slug: string
  title: string
  excerpt: string
  content: string
  date: string
  readTime: number
  tags: string[]
  featured?: boolean
  accent?: string // decorative symbol
}

export const posts: Post[] = [
  {
    slug: 'query-timeout-sethint',
    title: 'como forcei o MongoDB a obedecer (e parei de tomar timeout) com SetHint()',
    excerpt:
      'O query planner sempre escolhia o primeiro índice que ele achava correto (mas não para o meu caso) e como eu resolvi',
    content: `A tela estava mais ou menos assim:
    [iframe](/images/error_504_blog_theme.svg)
    Uma listagem de emissões batendo *timeout* em produção. Sessenta segundos. Oitenta e seis emissões. Um número ridiculamente baixo pra não retornar nenhum resultado.

Fui olhar o código: estava certo. Fui ao banco, analisei os índices, nenhum servia bem para essa *query*. Criei um índice composto novo, rodei o *explain*, e o MongoDB simplesmente... ignorou. Zero *usage*. O *planner* continuava escolhendo o índice antigo como se o meu não existisse.

Esse post é sobre o que estava acontecendo por baixo, por que o índice novo não era escolhido, e como eu forcei o banco a usar o índice certo :)

## um contexto maior

Tínhamos uma *aggregation* na *collection* de emissões que estava demorando muuuito e batendo *timeout* (+60s) em produção e em homolog, com apenas 86 emissões dando *timeout*, o que é um número MUITO baixo para essa situação. Criei um índice composto novo, rodei o *explain*, e o *planner* ignorou, como se não fosse nada. COMO SE EU NÃO FOSSE NADA.

## por que isso pode acontecer

O MongoDB escolhe o índice através de um processo chamado *query planning*. Na versão 4.2.4 (versão que eu estava usando), ele funciona assim: para cada *query*, o planejador identifica os índices candidatos e os executa em paralelo por um curto período de teste. O plano que retornar resultados mais rápido vira o *winning plan*, e esse vencedor fica em *cache* para o MongoDB não precisar ficar refazendo a corrida toda hora.

O problema: o *cache* é baseado no "formato" da *query*, não no desempenho atual. Ele só é invalidado se um índice mudar, a *collection* for dropada, ou o servidor reiniciar. No meu caso, o índice antigo estava *cached* e continuava sendo escolhido mesmo com o novo índice composto disponível e mais eficiente.

**Primeira tentativa**: limpar o *cache* com \`planCacheClear()\`. O problema era: a *collection* era compartilhada, então todas as *queries* perderiam o plano *cached* e o *planner* refaria a corrida para cada uma, sob carga real, em produção, hehe. Mesmo assim, tentei. O que pode dar errado quando tudo já está errado, né?

Não resolveu. O *planner* refez a corrida e escolheu o índice antigo de novo. Faz sentido: o índice antigo existia há mais tempo, tinha mais dados no *cache* interno de estatísticas, e o período de teste não foi longo o suficiente para o novo índice composto provar vantagem.

## por que o índice novo era o certo: ESR Rule

Antes de chegar na solução, vale entender por que aquele índice específico era o correto, porque não é só criar um índice composto e boa.

Existe uma convenção chamada **ESR Rule** (Equality -> Sort -> Range) que define a ordem ideal dos campos em um índice composto. A lógica é:

✦ Campos de **igualdade exata** primeiro: eliminam o máximo de documentos logo de cara
✦ Campos de **ordenação** no meio: evitam um sort em memória depois
✦ Campos de **range** (\`$gte\`, \`$lte\`, \`$in\`) por último: são menos seletivos e prejudicam os anteriores se vierem antes

No meu caso: \`tenant_id\` (igualdade, filtra por tenant específico) -> \`type\` (igualdade, boolean exato) -> \`created_at\` (sort, ordenação por data). ESR certinho.

O índice antigo, \`idx_old_type\`, priorizava só \`type\`, sem considerar \`tenant_id\` nem a ordenação. Era menos seletivo: em vez de filtrar logo por tenant, ele varria muito mais documentos antes de chegar no resultado. Estruturalmente menos eficiente para essa query, mesmo que o planner insistisse nele.

## a solução: SetHint()

Aí veio o \`hint\`. Essa *query* específica só era chamada de um lugar no sistema inteiro: uma *aggregation* no serviço de emissões. Com apenas um ponto de uso, o risco de efeito colateral era quase zero.

O \`SetHint()\` é uma opção do *driver* do MongoDB que força o uso de um índice específico, ignorando o *query planner*. Ele não vai pro *pipeline*. é uma **instrução de execução**, passada junto com o \`Aggregate()\` no momento em que a *query* roda de verdade.

É importante entender que o *hint* e a *query* são coisas separadas:

✦ **O *pipeline*** (\`$match\`, \`$sort\`, \`$skip\`, \`$limit\`) define **o que** buscar
✦ **O *hint*** diz **como** buscar: qual índice usar, antes mesmo do MongoDB pensar em iniciar o *query planning*. ele simplesmente pula a corrida e vai direto, na pura confiança

O MongoDB não exige que o índice cubra todos os campos da *query*. Ele usa o índice pra fazer a triagem inicial, e os campos restantes são filtrados em cima do resultado já reduzido. O *hint* só precisa bater com a **assinatura do índice no banco**: a combinação exata de campos e ordem com que ele foi criado.

No meu caso, o índice criado foi:

\`\`\`
{ tenant_id: 1, type: 1, status: 1, created_at: -1 }
\`\`\`

Então o hint precisa ter exatamente esses campos, nessa ordem. são o "nome" do índice pro MongoDB. Se você passar campos a menos, ele não encontra o índice e ignora o hint (ou falha, dependendo da versão).

Em Go, o \`SetHint()\` é passado como opção dentro do \`Aggregate()\`:

\`\`\`go
db.Collection("records").Aggregate(ctx, pipe,
    options.Aggregate().SetAllowDiskUse(true),
    options.Aggregate().SetHint(bson.D{
        {Key: "tenant_id", Value: 1},
        {Key: "type", Value: 1},
        {Key: "status", Value: 1},
        {Key: "created_at", Value: -1},
    }),
)
\`\`\`

No meu caso específico, a *aggregation* rodava dentro de *goroutines*, e o *hint* tinha que estar **dentro de cada *goroutine***, junto com o \`Aggregate()\` que de fato executava a *query*. O \`pipe\` é só uma *slice* de estágios, ele não carrega opções de execução. Se você colocasse o *hint* fora, não teria onde aplicar.

Com o hint forçando o índice certo, a query parou de bater timeout. Em tenants com alto volume, que eram exatamente os que travavam, o tempo caiu de +60s para ~573ms.

⚠️ **importante:** hint te amarra ao índice. Se o índice mudar de nome ou for dropado, a query quebra em runtime, sem erro em tempo de compilação, sem aviso. Deixa um comentário no código explicando o *porquê* do hint estar ali, senão a próxima pessoa (ou você daqui 6 meses) vai achar que é um detalhe sem importância e remover. Use com consciência: é uma solução cirúrgica, não um padrão.

Não vou romantizar, pois isso daqui é um blog, e não um manual. Vamos lembrar disso... SEM JULGAMENTOS PF. Eu sei que 573ms ainda é bastante coisa. O índice em si resolve em ~35ms, mas o *sort* em memória de 421 documentos come o resto do tempo, e isso é um problema separado. Um \`$or\` com 10 *ranges* que impede o MongoDB de aproveitar a ordenação do índice, então ele busca tudo e ordena tudo na memória antes de paginar.

Mas a listagem voltou a funcionar. Antes era um grande e belo "Desculpe, não foi possível carregar a lista", agora é lento, e lento dá pra melhorar :D (falso otimismo) quando sair a correção lanço um *fork* com pt 2 desse post.

Isso entra na lista de coisas pra Luana do futuro resolver... com aprovação do *head*... óbvio. 
    `,
    date: '2025-05-03',
    readTime: 10,
    tags: ['golang', 'mongodb', 'performance'],
    featured: true,
  },

  {
    slug: 'merge-conflict',
    title: 'conflito de merge no GitHub == caos',
    excerpt:
      'git diz que não consegue fazer o merge automático. você entra em pânico. este post é sobre não entrar em pânico. (mesmo eu entrando. hipocrisia)',
    content: `Como todo mundo sabe, ou se não sabe, vai ficar sabendo agora hehe, toda empresa tem seu próprio *GitFlow*. Hoje vou falar sobre sobreviver a um *gitflow* que contém apenas dois ambientes: *staging* (pré-prod e dev) e *master* (prod) com um time de dev.

## meu maior inimigo: conflitos de branches

Quando você utiliza o ambiente de *staging*, que seria apenas para pré-prod, como ambiente de dev e QA também, fica mais complicado manter tudo estável. Ainda mais quando o assunto é datas de *deploy* que atrasam, mexendo com todo o restante que vem depois. Se o time não tem alguém responsável por acompanhar diariamente as *branches* abertas, muita coisa acaba ficando para trás e virando "lixo", poluindo o ambiente.

NADA é pior do que você fazer as alterações que precisa, dar *commit*, *push*, e na hora de abrir o PR: **can't automatically merge**
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

Eu já trabalhei em lugares com mais ambientes, inclusive um específico para dev, e também dava problema. Então o ponto de fato é: organização individual e coletiva.

## por que os conflitos acontecem?

O *git* usa um algoritmo chamado *3-way merge* para tentar resolver mudanças automáticas: ele compara o ancestral comum das duas *branches* com o estado atual de cada uma. Se as mudanças no mesmo trecho de código forem em *branches* diferentes, ele tenta resolver sozinho. Na maioria das vezes consegue. Mas quando as duas *branches* alteraram o mesmo trecho de formas diferentes, sem um ancestral claro que resolva, ele não consegue decidir qual versão prevalece, e aí vem o conflito.

O GitHub não é quem resolve isso. Ele só *mostra* o resultado. Quem faz o trabalho é o *git* localmente, quando você faz o *merge*. O que o GitHub faz ao abrir o PR é basicamente rodar essa mesma análise e te avisar se há trechos que ele não vai conseguir resolver automaticamente.

Na minha visão, ele faz um ótimo trabalho, porque a maioria das vezes que acontece um conflito, nem eu sei direito como resolver...

## dicas para minimizar os conflitos

*Zerar* infelizmente é impossível, mas dá pra reduzir bastante:

Mantenha a sua *branch* sempre atualizada. Antes de iniciar qualquer coisa, eu tenho um ritual: sempre dar *pull* na *branch* de origem, criar minha *branch* a partir disso, fazer *apenas* os ajustes necessários sem sair refatorando coisas que não são do *ticket*, subir, e depois disso cuidar com as datas. QA testou e jogou pra *deploy*? já subo a *branch* para *master* e fecho o PR.

Ponto crítico: infelizmente você não consegue fazer isso pelos amiguinhos. Então sim, vai ter *branch* antiga aberta, *branch* que nunca subiu, *branch* que você não faz a mínima ideia do que acontece. Mas calma, tudo se resolve com comunicação. "e se a pessoa não estiver mais na empresa?" apaga a *branch* dela e finge que nunca aconteceu :D
brincadeira. não faça isso.

Quando é algo que eu realmente não sei como resolver, eu peço ajuda. Pedir ajuda não mata, não dói. Cada conflito tem uma forma de se resolver.

## caçando a branch culpada

No meu caso, o processo é: conflito em algum arquivo? primeiro identifico quem está conflitando com a minha *branch*:

\`\`\`bash
git fetch origin
git log origin/staging..HEAD --oneline
\`\`\`

Ou se eu quiser ver quais arquivos estão conflitando *antes* de tentar o *merge*:

\`\`\`bash
git diff origin/staging...HEAD --name-only
\`\`\`

Com isso dá pra identificar quem tocou nos mesmos arquivos. Aí a conversa é direta: "oi, suas alterações estão conflitando com as minhas, a gente consegue alinhar antes de subir?"

## o erro clássico: merge do staging na sua branch

Quando o conflito é na minha própria *branch* antiga (o clássico "já mergeei uma coisa minha no *staging* e agora tenho uma *branch* nova baseada no *master*"), a tentação é dar um \`merge origin/staging\` na sua *branch* pra "atualizar". **não faz isso.**

O *staging* no nosso fluxo é um ambiente de integração e validação, não é a fonte da verdade do código. Dar *merge* do *staging* na sua *branch* é perigoso:

✦ **você puxa código que não deveria estar no *master* ainda.** pode ter *feature* do coleguinha que ainda não foi aprovada, está em QA, ou pode ser revertida. agora ela está na sua *branch*.
✦ **efeito dominó no *deploy*.** se a sua *branch* subir pro *master* levando junto esse código, a *feature* do coleguinha vai junto, sem revisão, sem aprovação, sem querer.
✦ **o histórico fica uma bagunça.** fica impossível rastrear o que veio de onde, e reverter vira pesadelo.

A solução que achamos onde eu trabalho é: criar uma **branch terciária de resolução** a partir da sua própria *branch*, que já tem o *master* como base, e trazer a conflitante pra dentro dela:

\`\`\`bash
git checkout minha-feature-nova
git checkout -b fix/resolve-conflito-minha-feature
git merge branch-que-deu-conflito
# resolvo os conflitos aqui com calma
git push origin fix/resolve-conflito-minha-feature
# abro PR dessa branch -> staging para validação
\`\`\`

*É o correto? Nu sei, mas é o que está funcionando atualmente. então é assim que vou continuar fazendo até termos uma solução definitiva e mais simples, rs.*

Dessa forma que mostrei, você mantém o escopo da sua *branch* original limpo, sem carregar nada que não é seu. A terciária existe só pra isolar a resolução do conflito, depois que entrar no *staging*, o trabalho dela acabou.

Uma coisa que eu percebi na prática: depois que a branch terciária sobe pro *staging* e a branch conflitante entra junto, na maioria das vezes quando eu volto na minha branch original e abro o PR pro *staging*... o conflito sumiu. Depois de pesquisar um pouco, faz sentido: o que acontece é que o *git* passa a ter um **ancestral comum mais recente** entre a minha branch e o staging depois da terciária. O algoritmo de merge consegue resolver automaticamente porque o ponto de divergência mudou, ele já sabe onde as duas histórias se separam, e como a resolução do conflito foi registrada nesse ponto, não tem mais o que conflitar. eu apenas aceito o presente e sigo em frente.
*uma tentativa de explicação visual de tudo isso*:

![diagrama de merge com branch terciária](/images/git_merge_blog_theme.svg)

## como eu resolvo na prática

quando o conflito aparece dentro da branch terciária e eu preciso sentar e resolver arquivo por arquivo, eu uso o próprio **VS Code**. ele destaca os conflitos com botões de "Accept Current / Accept Incoming / Accept Both" e dá pra ver o diff lado a lado. pra mim é o mais visual e menos estressante, especialmente quando o arquivo é grande e tem vários trechos conflitando ao mesmo tempo.

existe também o \`git checkout --ours\` e o \`--theirs\`, que são úteis quando o conflito é simples e você sabe exatamente qual versão prevalece sem precisar nem olhar o diff direito:

\`\`\`bash
git checkout --ours src/arquivo-conflitante.go   # fica com a sua versão
git checkout --theirs src/arquivo-conflitante.go # fica com a versão que veio do merge
\`\`\`

mas eu uso isso com muito cuidado, principalmente com *staging*. "pegar o theirs" num conflito com staging significa pegar o que está no ambiente de integração, e como a gente já viu, o staging pode ter código do coleguinha que ainda não subiu pra master. se eu fizer isso sem verificar, importo um problema sem perceber.

por isso meu fluxo é: VS Code pra visualizar, \`--ours\` ou \`--theirs\` só quando tenho certeza do que estou escolhendo, e sempre uma lida no diff final antes de commitar. nada de resolver conflito no automático e torcer pra dar certo.

## dicas finais

✦ sempre dar *pull* na *branch* de origem antes de criar a sua
✦ não refatorar o que não é do *ticket*
✦ pedir ajuda quando não souber resolver
✦ nunca dar *merge* da branch instável que contém mudanças não aprovadas na *sua* branch. seja ela a de conflito ou não

e o mais importante: quando o conflito aparecer, respira, caça a *branch* culpada, conversa com quem precisa, e resolve com calma. **a maioria dos conflitos é resolvível em 15 minutos com a pessoa certa do lado.**

*gitflow* perfeito não existe. time comunicativo e minimamente organizado sim.

*(em breve: o que suja o histórico do git, e o que não suja. tem mais coisa aí do que parece.)*
    `,
    date: '2025-04-28',
    readTime: 8,
    tags: ['git', 'workflow', 'vida dev'],
  },
  {
    slug: 'field-mask',
    title: 'maneira não tão certa de implementar protobuf FieldMask',
    excerpt:
      'Alguns campos precisavam ser editados, porém o PUT que tinha mudava tudo. Até o que não precisava. Solução: arriscar usar FieldMask como PATCH.',
    content: `
## antes: o PUT que fingia ser PATCH

antes era simples. o front abria a tela de edição de um recurso, fazia o spread de tudo, e mandava o objeto inteiro pro backend. todos os campos. sempre. independente do que o usuário tinha tocado.

\`\`\`json
{
  "resource": {
    "field_a": "valor",
    "field_b": "valor",
    "field_c": "valor",
    "nested": {
      "field_d": "valor",
      "field_e": "valor"
    }
  }
}
\`\`\`

o backend recebia tudo e sobrescrevia tudo. era um \`PUT\` disfarçado de \`PATCH\`. o endpoint até se chamava \`.../patch\`, mas o comportamento era de substituição total.

o problema: um cliente externo precisava gerenciar dois campos específicos em registros já existentes. só esses dois. mas com o sistema atual, qualquer atualização sobrescrevia o objeto inteiro, e qualquer campo que não viesse no request virava zero.

## o que é field mask

é um padrão para dizer ao backend: "atualize **apenas esses campos**, ignore o resto."

em vez de mandar o objeto completo e torcer pra não zerar nada, o caller declara exatamente o que quer mudar:

\`\`\`json
{
  "resource": {
    "field_a": "valor novo"
  },
  "field_mask": ["field_a"]
}
\`\`\`

o backend lê a lista, toca só nos campos declarados, e ignora tudo que não está lá. o que estava no banco antes continua intacto.

## quem usa

field mask não é uma ideia nova. é um padrão consolidado na indústria.

o **Google** define o padrão no [AIP-161](https://google.aip.dev/161) e usa em praticamente todas as APIs: Google Drive, Calendar, Gmail, Cloud. a especificação oficial do protobuf está em [protobuf.dev](https://protobuf.dev/reference/protobuf/google.protobuf/#field-mask).

a **Netflix** usa field mask internamente nas APIs gRPC entre microserviços, como documentado em posts da engenharia deles sobre redução de over-fetching e controle de atualizações parciais.

**Stripe, Twilio, Salesforce** adotam o mesmo padrão via \`updateMask\` ou \`fields\` nos requests de update.

a motivação é sempre a mesma: quando você tem objetos grandes e múltiplos clientes atualizando campos diferentes, mandar o objeto inteiro é perigoso. um campo que o cliente A não conhece pode ser zerado sem querer quando o cliente B salva. field mask resolve isso declarativamente.

## o que foi necessário mudar

a tarefa mexeu em quatro repositórios.

**kit:** onde ficam os contratos gRPC compartilhados entre os serviços. o \`PatchEmission\` existia, mas recebia o objeto completo diretamente. criei uma nova mensagem com o campo \`field_mask\` e atualizei a assinatura do RPC:

\`\`\`proto
message PatchEmissionRequest {
  EmissaoCompleta emissao = 1;
  google.protobuf.FieldMask field_mask = 2;
}

rpc PatchEmission (PatchEmissionRequest) returns (EmissaoCompleta) {}
\`\`\`

**repo-1:** a lógica principal. o service deixou de sobrescrever tudo e passou a iterar os paths declarados na mask. removi um guard que bloqueava registros em determinados estados sem motivo suficiente, e adicionei um novo para proteger o que realmente não deve ser editado.

**repo-2:** o BFF que intermedia o frontend e o repo-1. a rota mudou de \`PUT .../patch\` para \`PATCH .../{id}\` (sem o sufixo redundante), e atualizei o decoder para montar o request com a mask.

**repo-3:** que é um serviço de renovação automática. quando um campo é atualizado via patch, o renew precisa saber, porque quando gerar a próxima renovação, vai usar os dados do registro de origem como base. implementei a propagação via evento Kafka e a herança na criação automática.

## a parte que não foi trivial

o contrato gRPC mudou, é uma breaking change. o \`repo-2\` deixaria de compilar se tentasse usar o kit novo sem ser atualizado. a ordem de deploy importa: kit primeiro, depois repo-1, depois repo-2.

durante o desenvolvimento, para poder testar local, usei o \`replace\` directive do Go no \`go.mod\` para apontar o kit para o caminho local, sem precisar publicar uma versão nova a cada ajuste:

\`\`\`
replace github.com/sua-org/kit => ../kit
\`\`\`

staging continuou usando a versão antiga. só removi o \`replace\` na hora de abrir os PRs.

outra coisa não trivial: o formato de serialização do field mask no HTTP. o protobuf em JSON oficial serializa o \`FieldMask\` como uma string com vírgula: \`"field_a,field_b"\`. mas o \`encoding/json\` do Go não consegue desserializar isso automaticamente no tipo \`*fieldmaskpb.FieldMask\`. resultado: o field mask chegava \`nil\`, o loop não executava, e o backend retornava 200 OK sem salvar nada.

a solução foi fazer o decode manualmente nos dois BFFs, lendo o \`field_mask\` como \`[]string\` e construindo o \`FieldMask\` na mão:

\`\`\`go
var raw struct {
    Resource  json.RawMessage \`json:"resource"\`
    FieldMask []string        \`json:"field_mask"\`
}
json.Unmarshal(body, &raw)

req.FieldMask = &fieldmaskpb.FieldMask{Paths: raw.FieldMask}
\`\`\`

## o applyFieldMask

a primeira abordagem que considerei foi usar reflection ciente das json tags para navegar o path automaticamente:

\`\`\`
"nested.field_d"
     ↓
navega o struct até nested → field_d
copia só esse campo
\`\`\`

parecia elegante, com menos manutenção, mais simples e sinceramente, bem legível. qualquer campo novo funcionaria sem mexer no código.

porém, a versão final usa um switch explícito com cases fixos para cada campo suportado. conforme alinhado com o time. (sou a famosa PM - pau mandado), ficou mais verboso, mas cada campo permitido está declarado explicitamente. qualquer campo novo exige uma adição ao switch, um trabalhinho a mais, mas tudo bem né

os paths chegam no nível de campo individual: \`"nested.field_d"\` atualiza só aquele campo, não o objeto inteiro. adicionei guards de nil no topo da função para proteger structs aninhados que podem chegar vazios do banco ou do request, evitando panics em registros importados com campos faltantes.

## testar foi a melhor parte

com o run-local rodando e o [Bruno](https://usebruno.com/) (uso Bruno em vez do Postman), testar ficou fácil fácil: o id do registro já existente vai na URL, e no body só os campos que quero alterar com a mask. é só mandar.

\`\`\`json
PATCH /v1/.../emissions/68abc123def456

{
  "resource": {
    "field_a": "valor novo"
  },
  "field_mask": ["field_a"]
}
\`\`\`

resposta imediata, campo atualizado, o resto intacto. simples. lindo. melhor decisão.

deu um trabalhinho. não vou falar em detalhes sobre os 30 commits em cada repo. mas valeu a pena.

## o resultado

o endpoint virou um \`PATCH\` de verdade. o front manda só o que mudou, com a lista explícita do que pode ser tocado. o backend não adivinha nada, ele lê a lista e aplica.

\`\`\`
antes:
PUT .../patch
body: objeto inteiro (sempre, independente do que mudou)
comportamento: sobrescreve tudo

depois:
PATCH .../{id}
body: só os campos alterados + field_mask com os paths
comportamento: atualiza só o que foi declarado
\`\`\`

cada campo que pode ser atualizado está declarado explicitamente no switch. se não está lá, não é atualizado. por design. porque meu head quis. e é isso.

    `,
    date: '2025-04-20',
    readTime: 8,
    tags: ['protobuf', 'golang', 'microserviços'],
  },
  {
    slug: '3-anos-como-dev',
    title: '3 anos como dev',
    excerpt:
      'Da garçonete que subiu os projetos no GitHub às 21h um dia antes da entrevista até hoje: o que aprendi, o que ainda me frustra, e por que eu sigo.',
    content: `quando eu entrei na programação foi uma loucura.

eu estudava programação e seus derivados por conta da faculdade, mas era tudo muito abstrato. fazia um projeto aqui e ali, nada muito sério, sem absorver muita coisa. cabeça sempre cheia, por conta dos dois trabalhos que eu tinha.

a oportunidade não surgiu do nada. eu fui atrás. fiquei um booom tempo procurando vaga. o ano era 2023, mandei tanto currículo que provavelmente estou no banco de talentos de 90% das empresas BR.

até que consegui uma entrevista. com o próprio dono da empresa, onde eu morava. era 21h de uma quinta e ele pediu para eu subir os projetos que eu tinha no GitHub para ele dar uma olhada. não pensei duas vezes, subi tudo que tinha (não era muita coisa). eu estava no meu trabalho de garçonete, era um dia tranquilo, peguei o notebook e subi o que tinha. ansiosa, porque a entrevista era no outro dia.

cheguei lá sem saber o que esperar, afinal era minha primeira entrevista para dev. o homem começou a me perguntar com o que eu tinha mexido, o que eu sabia. eu falei tudo (zero preparação). aí ele me disse que a vaga era para Java no backend, uma parte do front com JSF e outra em React, entre outras linguagens e bancos. eu travei, porque eu tinha reprovado em POO na faculdade e sabia que Java era complexo. PRINCIPALMENTE PARA QUEM NÃO SABIA NADA.

não sei como, mas ele disse para eu começar na semana seguinte.

eu agradeci muito e fui embora sem acreditar. o salário era menor do que eu estava ganhando, eu ia iniciar como estagiária, presencial. mas, independente disso: era a primeira vez que eu tinha ganho um sim na programação.

pensei que seria difícil. foi mais difícil do que eu pensei. KKKKKKKKKKKKKKKK

nas primeiras semanas eu fiquei tão perdida. tão perdida... por sorte, eu tive um colega tão gente boa e paciente, que eu podia perguntar a coisa mais idiota possível e ele responderia. saudades, inclusive. eu me dava bem com todos. com o tempo fui pegando o jeito, perguntando bastante, usando um pouco o GPT quando ele ainda era péssimo. mas eu sempre dava conta. sempre fui atrás. 80 abas abertas, muita pesquisa.

e foi nessa época que confirmei o que eu já sentia: estava no lugar certo. que era aquilo que eu queria.

eu sempre quis mexer com algo nesse ramo. mas na adolescência eu só tive contato com isso quando meu irmão saía de casa e eu ia correndo pro PC dele fazer script no Facebook para passar todos os 5 mil amigos de uma vez para os grupos que eu participava. era tão inocente e ingênua que sinceramente não sabia que programação pagava tanto. tanto que, quando consegui o estágio, eu ganhava como qualquer outro estágio de ensino superior na minha cidade.

enfim. o tempo foi passando, eu já lidei com várias linguagens, vários problemas, vários devs. e hoje já se passaram 3 anos.

e as perguntas nunca acabam. a dúvida principal que tenho atualmente é: sou pleno ou ainda sou júnior?

para quem não sabe, programadores têm níveis, e o salário é baseado nisso. mas o que determina que você é pleno? você mesmo? as pessoas chegam e te falam? ALGUÉM ME RESPONDE

sem brincs, a real é que não existe régua. o que mais vejo é: júnior precisa de direcionamento constante, pleno consegue pegar um problema, investigar, e resolver sozinho, mesmo sem saber tudo. a diferença não é saber mais, é saber como agir em cada problema. de forma correta, simples, prática. e isso, olhando pra trás, eu já faço faz tempo. mas não sou a única. programação é uma área total autodidata. ninguém vai pegar na tua mãozinha e te ensinar a engatinhar, você tem que se lascar fi

mas o título demora a chegar, e tudo bem. às vezes é frustrante, sim. mas tento focar no meu progresso sem me comparar.

de qualquer forma, eu sigo. feliz, me estressando, aprendendo, e esperando minha promoção. (indireta)

eu to vivendo um sonho, e preciso me agradecer pela coragem. às vezes, é difícil reconhecer o próprio trajeto, e eu, mais que ninguém, tenho muuuita dificuldade com isso. não quero ser arrogante, mas eu sofri pra chegar até aqui, e sei que mereço as coisas boas que essa profissão pode oferecer. sei que o sofrimento ainda não acabou. mas estou ansiosa para os próximos capítulos.

e tenho certeza de uma coisa: se eu tivesse entrado na programação só pelo dinheiro, teria desistido no primeiro semestre. hoje sigo aqui, escrevendo para um blog.

![eu](/images/girl%20blogging.jpeg)
    `,
    date: '2026-05-10',
    readTime: 5,
    tags: ['vida dev', 'carreira', 'aprendizado'],
  },
  {
    slug: 'run-local-refatoracao',
    title: 'orquestração local refatorada com Air e volume mounts',
    excerpt:
      'O run-local do meu trabalho era um caos: sem hot reload, repos duplicados, 20 docker-composes dessincronizados. Refatorei tudo com Air e volume mounts, e recebi vários elogios (1)',
    content: `Antes de qualquer coisa: não vou fingir que era algo elegante e bem feito (desculpa ex dev que criou ele). O *run-local* era um caos. COMPLETO. Minha primeira impressão foi: meudeus, o que é isso (choro). O que era pra ser uma ferramenta de desenvolvimento local, era na verdade código morto. sem utilidade nenhuma.

Para rodar qualquer coisa localmente, você tinha que **copiar o repo inteiro pra dentro da pasta** do run-local. O resultado? Cada projeto tinha seu próprio \`docker-compose.yaml\`, e como precisava rodar vários projetos, acabavam surgindo cópias. Muitas cópias. Umas 20 cópias de \`docker-compose.yaml\` espalhadas por lá.

E como eu gosto de trabalhar separadamente em cada projeto, eu tinha que ficar colando as mudanças em cada uma dessas cópias toda vez que precisava subir alguma coisa. IMPOSSÍVEL. Eu só passava raiva.

O pior: não tinha *hot reload* nenhum. Alterou o código? Derruba tudo, rebuilda a imagem Docker inteira do zero, sobe de novo. Para cada mudança. Em cada serviço. Toda vez. Sério, gente, isso é insustentável. Mas como todo mundo estava muito ocupado, o run-local ficou de lado, e as coisas eram testadas diretamente em staging. Não culpo meus colegas, eu me injuriei tanto que fiz a refatoração de madrugada mesmo.

Perdi algumas noites de sono, mas valeu cada minuto. De verdade. Acho que em "toda" a minha carreira, foi a melhor refatoração que já fiz.

## o problema raiz

A estrutura antiga era basicamente essa: cada serviço tinha sua própria pasta com código duplicado e seu próprio \`docker-compose.yaml\` dentro:

\`\`\`bash
run-local/
├── servico-a/
│   ├── ... (código duplicado do repo)
│   └── docker-compose.yaml
├── servico-b/
│   ├── ... (código duplicado do repo)
│   └── docker-compose.yaml
├── servico-c/
│   └── ...
└── ... (mais ~18 outros)
\`\`\`

Como cada um trabalhava de um jeito, alguns subiam o código atualizado, outros não. Tinha que lembrar de copiar pro clone aqui dentro. Ninguém lembrava. Tudo ficava dessincronizado. Era como se o run-local estivesse há uns 800 commits atrás da master.

## a solução: volume mounts + Air

A ideia central é simples: **não copie o código, monte ele**.

*Volume mount* é uma forma de compartilhar uma pasta entre seu computador e o container Docker. Em vez de copiar cada repo pra dentro do run-local, você diz pro Docker: "a pasta \`~/projetos/meu-servico\` do meu computador e a pasta \`/app\` do container são a mesma coisa". Não é uma cópia, é o mesmo diretório. Qualquer mudança que você faz no VS Code, ou em outra IDE, o container já enxerga instantaneamente.

No \`docker-compose.yaml\`:

\`\`\`yaml
meu-servico:
  build:
    context: .
    dockerfile: .docker.air/Dockerfile
  volumes:
    - ../meu-servico:/app
    - ./.docker.air/common-archives/.air.toml:/app/.air.toml:ro
    - go-mod-cache:/go/pkg/mod
    - go-build-cache:/root/.cache/go-build
\`\`\`

O \`../meu-servico\` é relativo ao run-local, ou seja: \`~/projetos/meu-servico\`. Cada linha de \`volumes\` faz uma coisa diferente:

◈ \`../meu-servico:/app\` monta o repo real do seu computador dentro do container no caminho \`/app\`. É o que permite o *hot reload*: o *Air* roda dentro do container lendo de \`/app\`, que é literalmente a mesma pasta que você edita no VS Code.

◈ \`.air.toml:/app/.air.toml:ro\` injeta o arquivo de configuração do *Air* dentro do container. O \`:ro\` é *read-only*: o container pode ler mas não pode modificar.

◈ \`go-mod-cache:/go/pkg/mod\` é o cache dos módulos Go. Sem isso, toda vez que o container reiniciasse ele baixaria todas as dependências do zero. Com isso, o download acontece uma vez e fica salvo entre restarts.

◈ \`go-build-cache:/root/.cache/go-build\` é o cache de compilação. Faz o build ser mais rápido nas próximas vezes porque o Go aproveita o que já compilou antes.

Mas volume mount sozinho não resolve o *hot reload*. É aí que entra o *Air*.

O *Air* é uma ferramenta que fica dentro do container observando os arquivos \`.go\`. Quando você salva qualquer coisa, ele detecta a mudança, recompila só o binário (~2s) e reinicia o processo automaticamente. Sem rebuildar imagem. Sem rodar \`make up\` de novo. Sem fazer nada.

O arquivo de configuração fica em \`.docker.air/common-archives/.air.toml\` e é montado via volume em todos os containers. Nenhum repo precisa ter esse arquivo, o run-local injeta pra todo mundo:

\`\`\`toml
root = "."        # onde o Air vai olhar (/app do container, que é seu repo montado)
tmp_dir = "tmp"   # pasta temporária onde o binário compilado fica guardado

[build]
  cmd = "go build -o ./tmp/server ./cmd/server/main.go"
  entrypoint = "tmp/server"  # bin está deprecated, use entrypoint

  include_ext = ["go"]             # só reage a arquivos .go — ignora .yaml, .md, etc.
  exclude_dir = ["tmp", "vendor"]  # não observa essas pastas (evita loop)

  delay = 1000       # espera 1000ms após a última mudança antes de compilar
  stop_on_error = true

[log]
  time = true
\`\`\`

Uma limitação que vale saber: o \`cmd\` assume que o *entry point* do serviço é \`./cmd/server/main.go\`. Se algum dia um repo usar \`cmd/api/main.go\` por exemplo, o *Air* vai falhar no build e você vai ver no log. Aí é só ajustar aqui no run-local, sem precisar mexer no repo.

O *Air* é open source: [github.com/air-verse/air](https://github.com/air-verse/air)

O fluxo completo fica assim:

\`\`\`
você salva meu-servico/pkg/alguma-coisa/service.go
    ↓
volume mount já reflete a mudança no container
    ↓
Air detecta o arquivo .go mudou
    ↓
roda: go build -o ./tmp/server ./cmd/server/main.go
    ↓
mata o processo anterior, sobe o binário novo
    ↓
nos logs: building... → running...
\`\`\`

O \`dockerfile: .docker.air/Dockerfile\` aponta pra um único arquivo compartilhado por todos os serviços. Antes cada um tinha o seu próprio, sem padrão. Agora é um só:

\`\`\`dockerfile
FROM golang:1.25-alpine

RUN apk add git

RUN git config --global url."https://\${GIT_USER}:\${GIT_TOKEN}@github.com/sua-org".insteadOf "https://github.com/sua-org"

ENV GOPRIVATE=github.com/sua-org

WORKDIR /app

RUN go install github.com/air-verse/air@latest

CMD ["air", "-c", ".air.toml"]
\`\`\`

Genérico por design: o que diferencia um serviço do outro é só o volume mount que aponta pro repo certo. A imagem em si é a mesma. O \`insteadOf\` aponta só pro org da empresa, não pra todo o GitHub. ele só intercepta módulos privados daquele org, sem afetar dependências públicas de outros lugares.

A imagem é criada **uma vez** no primeiro \`docker compose up\`. Depois disso nunca mais, enquanto você só estiver editando código.

## o script que gera as variáveis

Tinha um outro problema: as variáveis de ambiente. Cada serviço precisa saber o endereço dos outros. Em *staging* são IPs do cluster (\`10.x.x.x\`). Localmente são os nomes dos containers Docker (\`meu-servico:9090\`).

Antes isso era mantido manualmente. Alguém adicionava um serviço novo no compose e esquecia de atualizar o \`.env.local\`. O serviço subia e ficava tentando bater em IP que não existia.

A solução foi um script que **lê o \`docker-compose.yaml\` e gera automaticamente as linhas \`*_SERVICE_HOST\`** que precisam entrar no \`.env.local\`:

\`\`\`bash
make gen-env
# saída:
# SERVICO_A_SERVICE_HOST="servico-a:9090"
# SERVICO_B_SERVICE_HOST="servico-b:9090"
# SERVICO_C_SERVICE_HOST="servico-c:9090"
# ... todos os outros
\`\`\`

Não precisa rodar isso todo dia. Só quando adicionar um serviço novo. Mas eliminou a classe de bug "serviço novo subiu mas ninguém atualizou as variáveis".

## estrutura final

\`\`\`
run-local/
├── .docker.air/
│   ├── Dockerfile                    ← imagem base com Air + Go
│   └── common-archives/
│       └── .air.toml                 ← config Air compartilhada
├── scripts/
│   └── gen-local-env.sh
├── docker-compose.yaml
├── Makefile
└── README.md
\`\`\`

Os repos continuam em \`~/projetos/\` separados. O run-local só orquestra: não sabe nada sobre o código de nenhum serviço, só sabe onde encontrá-los.

## o resultado na prática

Antes: alterar código → parar container → rebuildar imagem inteira (~30-60s) → subir de novo → torcer pra funcionar. E ainda manter cópias sincronizadas.

Depois: salva o arquivo → Air detecta → recompila só o binário → \`running...\` em ~2 segundos. Os repos ficam onde sempre estiveram.

O mais satisfatório foi quando tudo ficou pronto. README subiu bonitinho, fui rodar a primeira vez e quase chorei de alegria. E fiquei ainda mais feliz quando meus colegas começaram a usar. Agora tudo está simples, fácil, intuitivo e rápido. 0 estresse. 
![feedback do colega sobre o run-local](/images/run_local_feedback.svg)
    `,
    date: '2026-05-09',
    readTime: 7,
    tags: ['docker', 'golang', 'workflow'],
  },
    {
    slug: 'defer-go',
    title: 'quando a ordem do defer virou um bug silencioso',
    excerpt: 'Como um bug silencioso de ordem de execução com defer e middlewares empilhados no Go me fez investigar por horas... e no final a correção foram duas linhas trocadas de lugar.',
    content: `## O que é o \`defer\` no Go?

Se você está começando com Go, provavelmente já viu \`defer\` sendo usado para fechar arquivos, conexões de banco, ou liberar recursos. A ideia é simples: **defer adia a execução de uma função para o momento em que a função ao redor retorna**.

\`\`\`go
func lerArquivo() {
    f, _ := os.Open("arquivo.txt") // erro ignorado por simplicidade
    defer f.Close() // vai rodar quando lerArquivo() retornar
    // ... faz coisas com o arquivo
}
\`\`\`

De boa, né? Mas tem um detalhe que pode te fazer passar horas debugando um bug silencioso, e foi exatamente o que aconteceu comigo.

Ponto importante antes de você começar a ler: a palavra \`defer\` será repetida inúmeras vezes. Espero que não se importe.

## A regra que todo mundo esquece: LIFO

Quando você tem **múltiplos defers** em uma função, eles executam na ordem inversa: **LIFO (Last In, First Out)**. O último \`defer\` registrado é o primeiro a rodar.

\`\`\`go
func exemplo() {
    defer fmt.Println("primeiro defer")  // roda por último
    defer fmt.Println("segundo defer")   // roda segundo
    defer fmt.Println("terceiro defer")  // roda primeiro
}

// Output:
// terceiro defer
// segundo defer
// primeiro defer
\`\`\`

Até faz sentido quando você vê assim. Mas e quando os defers estão escondidos dentro de middlewares empilhados?

A ênfase no middleware é porque foi onde o bug apareceu, mas o \`defer\` em si não tem nada de especial por estar dentro de um middleware. Você pode colocar \`defer\` em qualquer função Go.

O que tornava o bug sutil é que os defers estavam **escondidos**, você não via dois \`defer\` na mesma função, via dois middlewares sendo aplicados em sequência. Parecia código normal de inicialização, não duas chamadas diferidas competindo em ordem.

Se estivesse tudo numa função só, ficaria óbvio, como já vimos, mas vou reforçar:

\`\`\`go
func operacao() {
    defer publicarKafka() // roda segundo
    defer indexarES()     // roda primeiro
}
\`\`\`

Mas espalhado em middlewares separados, a conexão entre a ordem de aplicação e a ordem de execução do \`defer\` fica invisível.

## O bug que só aparecia de manhã

No trabalho, temos um dashboard que mostra dados relevantes para os clientes. O problema: **as mudanças do dia só apareciam no dashboard de manhã**, após um re-index completo que roda via CLI toda madrugada. Nenhum log de erro, nada quebrava, mas tinha esse delay infernal.

Durante o dia, quando tinha uma ação do usuário (criar, atualizar, excluir) dentro da plataforma, o dashboard ficava desatualizado. No dia seguinte, tudo batia certinho.

Passei um bom tempo investigando: Redis com cache velho que não atualizava? Race condition no Elasticsearch (ES)? Dados incorretos? Divergência entre os campos que o dashboard buscava em comparação a exportação? (a exportação era a minha fonte da verdade, então fiquei comparando os dois)

A resposta estava na **ordem dos middlewares**.

## Middlewares como camadas de cebola

A arquitetura usa o padrão de middlewares empilhados, cada um envolve o serviço e adiciona comportamento via \`defer\`:

\`\`\`go
// IndexingMiddleware: indexa o registro no Elasticsearch após cada operação
func (mw indexingMiddleware) PostRecord(ctx context.Context, c *store.Record) (err error) {
    defer func() {
        if err == nil {
            mw.indexElastic(ctx, c) // atualiza o ES
        }
    }()
    return mw.next.PostRecord(ctx, c)
}

// QueueingMiddleware: publica evento no Kafka após cada operação
func (mw queueingMiddleware) PostRecord(ctx context.Context, c *store.Record) (err error) {
    defer func() {
        if err == nil {
            mw.producer.SendMessage(ctx, ...) // avisa o dashboard via Kafka
        }
    }()
    return mw.next.PostRecord(ctx, c)
}
\`\`\`

E a inicialização do serviço estava assim:

\`\`\`go
svc = QueueingMiddleware(config.Kafka)(svc)   // aplicado primeiro
svc = IndexingMiddleware(config.ElasticSearch)(svc) // aplicado depois
\`\`\`

Parece que o Indexing roda antes, né? **Errado :)**

## Por que a ordem de aplicação importa

Quando você aplica middlewares assim, está criando camadas:

\`\`\`
IndexingMiddleware (camada mais externa)
  └── QueueingMiddleware (camada interna)
        └── service (núcleo)
\`\`\`

O último middleware aplicado vira a **camada mais externa**. E como \`defer\` é LIFO, o \`defer\` da camada mais externa roda **por último**.

Então o fluxo real era:

\`\`\`
1. IndexingMiddleware recebe a chamada
2. Passa para QueueingMiddleware
3. QueueingMiddleware passa para o service
4. Service executa e retorna
5. defer do QueueingMiddleware roda → publica no Kafka ← PRIMEIRO ❌
6. defer do IndexingMiddleware roda → indexa no ES ← SEGUNDO (tarde demais)
\`\`\`

O dashboard recebia o evento Kafka, ia buscar no Elasticsearch, e encontrava o dado **anterior** porque o ES ainda não tinha sido atualizado.

## O fluxo completo para entender o impacto

O Kafka aqui não carrega os dados do registro, ele é só uma **notificação**: "oi, esse registro mudou, vai buscar os dados atualizados". Para ficar um pouco melhor de entender:

[iframe](/images/defer_antes_blog_theme.svg)

[iframe](/images/defer_depois_blog_theme.svg)

## A correção: duas linhas

\`\`\`go
// antes (errado)
svc = QueueingMiddleware(config.Kafka)(svc)
svc = IndexingMiddleware(config.Elasticsearch)(svc)

// depois (correto)
svc = IndexingMiddleware(config.Elasticsearch)(svc)
svc = QueueingMiddleware(config.Kafka)(svc)
\`\`\`

Duas linhas trocadas de lugar. Horas de investigação. Clonazepam como companheiro. Tinha pedido para o Claude, GPT, TODAS AS ENTIDADES DE IA e nenhuma sabia. Para no final ser algo tão bobo assim.

## O que aprender com isso

✦ \`defer\` é LIFO: o último registrado é o primeiro a executar
✦ Quando middlewares usam \`defer\` para executar lógica pós-chamada, **a ordem de composição define a ordem de execução**: o mais externo roda por último. Sem \`defer\`, a lógica do middleware mais externo roda primeiro, na ida. Vale entender como sua arquitetura específica empilha essas chamadas, porque o impacto do LIFO depende disso
✦ Bugs silenciosos de ordem de execução são os mais difíceis de encontrar porque nada quebra "visivelmente". O sistema continua funcionando, mas com comportamento errado.
✦ Logs estratégicos em pontos-chave do fluxo são seus melhores amigos nesses casos

Se quiser se aprofundar no comportamento do \`defer\` no Go:
✦ [Go spec — Defer statements](https://go.dev/ref/spec#Defer_statements)
✦ [Tour do Go — Defer](https://go.dev/tour/flowcontrol/12)
✦ [Effective Go — Defer](https://go.dev/doc/effective_go#defer)

E por último e menos relevante: a palavra \`defer\` foi usada exatamente 48 vezes no total. Eu avisei.
    `,
    date: '2026-05-24',
    readTime: 12,
    tags: ['defer', 'golang', 'aprendizado'],
  },
]

export const getPostBySlug = (slug: string) =>
  posts.find((p) => p.slug === slug)

export const getFeaturedPost = () => posts.find((p) => p.featured) ?? posts[0]

export const getRecentPosts = (limit = 4) =>
  posts.filter((p) => !p.featured).slice(0, limit)
