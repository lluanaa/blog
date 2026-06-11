import type { Post } from './types'

export const post: Post = {
  slug: 'query-timeout-sethint',
  title: 'como forcei o MongoDB a obedecer (e parei de tomar timeout) com SetHint()',
  title_en: 'how I forced MongoDB to obey (and stopped getting timeouts) with SetHint()',
  excerpt:
    'O query planner sempre escolhia o primeiro índice que ele achava correto (mas não para o meu caso) e como eu resolvi',
  excerpt_en: 'The query planner always picked the first index it thought was right (just not for my case) and how I fixed it',
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

O \`SetHint()\` é uma opção do *driver* do MongoDB que força o uso de um índice específico, ignorando o *query planner*. Ele não vai pro *pipeline*. É uma **instrução de execução**, passada junto com o \`Aggregate()\` no momento em que a *query* roda de verdade.

É importante entender que o *hint* e a *query* são coisas separadas:

✦ **O *pipeline*** (\`$match\`, \`$sort\`, \`$skip\`, \`$limit\`) define **o que** buscar
✦ **O *hint*** diz **como** buscar: qual índice usar, antes mesmo do MongoDB pensar em iniciar o *query planning*. Ele simplesmente pula a corrida e vai direto, na pura confiança

O MongoDB não exige que o índice cubra todos os campos da *query*. Ele usa o índice pra fazer a triagem inicial, e os campos restantes são filtrados em cima do resultado já reduzido. O *hint* só precisa bater com a **assinatura do índice no banco**: a combinação exata de campos e ordem com que ele foi criado.

No meu caso, o índice criado foi:

\`\`\`
{ tenant_id: 1, type: 1, status: 1, created_at: -1 }
\`\`\`

Então o hint precisa ter exatamente esses campos, nessa ordem. São o "nome" do índice pro MongoDB. Se você passar campos a menos, ele não encontra o índice e ignora o hint (ou falha, dependendo da versão).

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

No meu caso específico, a *aggregation* rodava dentro de *goroutines*, e o *hint* tinha que estar **dentro de cada *goroutine***, junto com o \`Aggregate()\` que de fato executava a *query*. O \`pipe\` é só uma *slice* de estágios, ele não carrega opções de execução. Se colocasse o *hint* fora, não teria onde aplicar.

Com o hint forçando o índice certo, a query parou de bater timeout. Em tenants com alto volume, que eram exatamente os que travavam, o tempo caiu de +60s para ~573ms.

⚠️ **importante:** hint te amarra ao índice. Se o índice mudar de nome ou for dropado, a query quebra em runtime, sem erro em tempo de compilação, sem aviso. Deixa um comentário no código explicando o *porquê* do hint estar ali, senão a próxima pessoa (ou você daqui 6 meses) vai achar que é um detalhe sem importância e remover. Use com consciência: é uma solução cirúrgica, não um padrão.

Não vou romantizar, pois isso daqui é um blog, e não um manual. Vamos lembrar disso... SEM JULGAMENTOS PF. Eu sei que 573ms ainda é bastante coisa. O índice em si resolve em ~35ms, mas o *sort* em memória de 421 documentos come o resto do tempo, e isso é um problema separado. Um \`$or\` com 10 *ranges* que impede o MongoDB de aproveitar a ordenação do índice, então ele busca tudo e ordena tudo na memória antes de paginar.

Mas a listagem voltou a funcionar. Antes era um grande e belo "Desculpe, não foi possível carregar a lista", agora é lento, e lento dá pra melhorar :D (falso otimismo) quando sair a correção lanço um *fork* com pt 2 desse post.

Isso entra na lista de coisas pra Luana do futuro resolver... com aprovação do *head*... óbvio.
    `,
  content_en: `The screen looked something like this:
    [iframe](/images/error_504_blog_theme_en.svg)
    An emissions listing hitting *timeout* in production. Sixty seconds. Eighty-six emissions. A ridiculously low number to return zero results.

I went to look at the code: it was fine. I went to the database, analyzed the indexes, none of them worked well for that *query*. I created a new compound index, ran the *explain*, and MongoDB simply... ignored it. Zero *usage*. The *planner* kept choosing the old index as if mine didn't exist.

This post is about what was happening under the hood, why the new index wasn't being chosen, and how I forced the database to use the right index :)

## some context

We had an *aggregation* on the emissions *collection* that was taking foooorever and hitting *timeout* (+60s) in production and staging, with only 86 emissions timing out, which is a VERY low number for that situation. I created a new compound index, ran the *explain*, and the *planner* ignored it, like it was nothing. AS IF I WAS NOTHING.

## why this can happen

MongoDB chooses an index through a process called *query planning*. In version 4.2.4 (the version I was using), it works like this: for each *query*, the planner identifies candidate indexes and runs them in parallel for a short trial period. The plan that returns results fastest becomes the *winning plan*, and that winner gets *cached* so MongoDB doesn't have to redo the race every time.

The problem: the *cache* is based on the *query*'s "shape", not its current performance. It only gets invalidated if an index changes, the *collection* is dropped, or the server restarts. In my case, the old index was *cached* and kept getting chosen even with the new compound index available and more efficient.

**First attempt**: clear the *cache* with \`planCacheClear()\`. The problem was: the *collection* was shared, so all *queries* would lose their *cached* plan and the *planner* would redo the race for each one, under real load, in production, hehe. Even so, I tried. What can go wrong when everything is already wrong, right?

It didn't work. The *planner* redid the race and chose the old index again. Makes sense: the old index had existed longer, had more data in the internal statistics *cache*, and the trial period wasn't long enough for the new compound index to prove its advantage.

## why the new index was the right one: ESR Rule

Before getting to the solution, it's worth understanding why that specific index was the correct one, because it's not just about creating a compound index and calling it a day.

There's a convention called the **ESR Rule** (Equality -> Sort -> Range) that defines the ideal field order in a compound index. The logic is:

✦ **Equality** fields first: eliminate as many documents as possible right away
✦ **Sort** fields in the middle: avoid an in-memory sort later
✦ **Range** fields (\`$gte\`, \`$lte\`, \`$in\`) last: they're less selective and hurt the previous fields if they come before them

In my case: \`tenant_id\` (equality, filters by specific tenant) -> \`type\` (equality, exact boolean) -> \`created_at\` (sort, ordering by date). ESR to the letter.

The old index, \`idx_old_type\`, prioritized only \`type\`, without considering \`tenant_id\` or the ordering. It was less selective: instead of filtering by tenant right away, it scanned many more documents before reaching the result. Structurally less efficient for this query, even if the planner insisted on it.

## the solution: SetHint()

Then came \`hint\`. This specific *query* was only called from one place in the entire system: an *aggregation* in the emissions service. With only one point of use, the risk of side effects was almost zero.

\`SetHint()\` is an option in the MongoDB *driver* that forces the use of a specific index, bypassing the *query planner*. It doesn't go into the *pipeline*. It's an **execution instruction**, passed alongside \`Aggregate()\` at the moment the *query* actually runs.

It's important to understand that the *hint* and the *query* are separate things:

✦ **The *pipeline*** (\`$match\`, \`$sort\`, \`$skip\`, \`$limit\`) defines **what** to look for
✦ **The *hint*** says **how** to look: which index to use, before MongoDB even thinks about starting *query planning*. It simply skips the race and goes straight in, pure confidence

MongoDB doesn't require the index to cover all fields in the *query*. It uses the index for the initial filtering, and the remaining fields are filtered on top of the already-reduced result. The *hint* just needs to match the **index signature in the database**: the exact combination of fields and order it was created with.

In my case, the index created was:

\`\`\`
{ tenant_id: 1, type: 1, status: 1, created_at: -1 }
\`\`\`

So the hint needs exactly those fields, in that order. They're the "name" of the index to MongoDB. If you pass fewer fields, it won't find the index and ignores the hint (or fails, depending on the version).

In Go, \`SetHint()\` is passed as an option inside \`Aggregate()\`:

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

In my specific case, the *aggregation* ran inside *goroutines*, and the *hint* had to be **inside each *goroutine***, alongside the \`Aggregate()\` that actually executed the *query*. The \`pipe\` is just a slice of stages, it doesn't carry execution options. If you put the *hint* outside, there'd be nowhere to apply it.

With the hint forcing the right index, the query stopped timing out. For high-volume tenants, which were exactly the ones freezing up, the time dropped from +60s to ~573ms.

⚠️ **important:** hint ties you to the index. If the index gets renamed or dropped, the query breaks at runtime, with no compile-time error, no warning. Leave a comment in the code explaining *why* the hint is there, otherwise the next person (or you six months from now) will think it's an unimportant detail and remove it. Use it consciously: it's a surgical solution, not a pattern.

I won't romanticize this, because this is a blog, not a manual. Let's remember that... NO JUDGMENT PLS. I know 573ms is still quite a lot. The index itself resolves in ~35ms, but the in-memory *sort* of 421 documents eats the rest of the time, and that's a separate problem. A \`$or\` with 10 *ranges* that prevents MongoDB from taking advantage of the index's ordering, so it fetches everything and sorts everything in memory before paginating.

But the listing started working again. Before it was one big beautiful "Sorry, we couldn't load the list", now it's slow, and slow can be improved :D (false optimism) when the fix ships I'll launch a *fork* with pt 2 of this post.

This goes on the list of things for future Luana to solve... with the *head*'s approval... obviously.
    `,
  date: '2025-05-03',
  readTime: 10,
  tags: ['golang', 'mongodb', 'performance'],
  gopher: '/images/GOPHER_MIC_DROP.png',
}
