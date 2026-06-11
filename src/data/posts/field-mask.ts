import type { Post } from './types'

export const post: Post = {
  slug: 'field-mask',
  title: 'maneira não tão certa de implementar protobuf FieldMask',
  title_en: 'the not-so-right way to implement protobuf FieldMask',
  excerpt:
    'Alguns campos precisavam ser editados, porém o PUT que tinha mudava tudo. Até o que não precisava. Solução: arriscar usar FieldMask como PATCH.',
  excerpt_en: 'Some fields needed to be updated, but the PUT we had changed everything, even what it should not. Solution: risk using FieldMask as a PATCH.',
  content: `
## antes: o PUT que fingia ser PATCH

Antes era simples. O front abria a tela de edição de um recurso, fazia o spread de tudo, e mandava o objeto inteiro pro backend. Todos os campos. Sempre. Independente do que o usuário tinha tocado.

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

O backend recebia tudo e sobrescrevia tudo. Era um \`PUT\` disfarçado de \`PATCH\`. O endpoint até se chamava \`.../patch\`, mas o comportamento era de substituição total.

O problema: um cliente externo precisava gerenciar dois campos específicos em registros já existentes. Só esses dois. Mas com o sistema atual, qualquer atualização sobrescrevia o objeto inteiro, e qualquer campo que não viesse no request virava zero.

## o que é field mask

É um padrão para dizer ao backend: "atualize **apenas esses campos**, ignore o resto."

Em vez de mandar o objeto completo e torcer pra não zerar nada, o caller declara exatamente o que quer mudar:

\`\`\`json
{
  "resource": {
    "field_a": "valor novo"
  },
  "field_mask": ["field_a"]
}
\`\`\`

O backend lê a lista, toca só nos campos declarados, e ignora tudo que não está lá. O que estava no banco antes, dos demais campos, continua intacto.

## quem usa

Field mask não é uma ideia nova. É um padrão consolidado.

O **Google** define o padrão no [AIP-161](https://google.aip.dev/161) e usa em praticamente todas as APIs: Google Drive, Calendar, Gmail, Cloud. A especificação oficial do protobuf está em [protobuf](https://protobuf.dev/reference/protobuf/google.protobuf/#field-mask).

A **Netflix** usa field mask internamente nas APIs gRPC entre microservices, como documentado em posts da engenharia deles sobre redução de over-fetching e controle de atualizações parciais.

**Stripe, Twilio, Salesforce** adotam o mesmo padrão via \`updateMask\` ou \`fields\` nos requests de update.

A motivação é sempre a mesma: quando você tem objetos grandes e múltiplos clientes atualizando campos diferentes, mandar o objeto inteiro é perigoso. Um campo que o cliente A não conhece pode ser zerado sem querer quando o cliente B salva. Field mask resolve isso declarativamente.

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
navega o struct até nested ⟶ field_d
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
  content_en: `
## before: the PUT pretending to be a PATCH

before it was simple. the front would open the resource edit screen, spread everything, and send the whole object to the backend. all fields. always. regardless of what the user had actually touched.

\`\`\`json
{
  "resource": {
    "field_a": "value",
    "field_b": "value",
    "field_c": "value",
    "nested": {
      "field_d": "value",
      "field_e": "value"
    }
  }
}
\`\`\`

the backend received everything and overwrote everything. it was a \`PUT\` disguised as a \`PATCH\`. the endpoint was even called \`.../patch\`, but the behavior was total replacement.

the problem: an external client needed to manage two specific fields in existing records. just those two. but with the current system, any update overwrote the entire object, and any field that didn't come in the request became zero.

## what is a field mask

it's a pattern for telling the backend: "update **only these fields**, ignore the rest."

instead of sending the complete object and hoping nothing gets zeroed out, the caller explicitly declares exactly what they want to change:

\`\`\`json
{
  "resource": {
    "field_a": "new value"
  },
  "field_mask": ["field_a"]
}
\`\`\`

the backend reads the list, touches only the declared fields, and ignores everything that isn't there. whatever was in the database before stays intact.

## who uses it

field mask isn't a new idea. it's a well-established industry pattern.

**Google** defines the standard in [AIP-161](https://google.aip.dev/161) and uses it in practically all their APIs: Google Drive, Calendar, Gmail, Cloud. the official protobuf spec is at [protobuf.dev](https://protobuf.dev/reference/protobuf/google.protobuf/#field-mask).

**Netflix** uses field mask internally in gRPC APIs between microservices, as documented in their engineering posts about reducing over-fetching and controlling partial updates.

**Stripe, Twilio, Salesforce** adopt the same pattern via \`updateMask\` or \`fields\` in update requests.

the motivation is always the same: when you have large objects and multiple clients updating different fields, sending the entire object is dangerous. a field that client A doesn't know about can get zeroed out accidentally when client B saves. field mask solves this declaratively.

## what needed to change

the task touched four repositories.

**kit:** where the shared gRPC contracts between services live. \`PatchEmission\` existed, but received the complete object directly. I created a new message with the \`field_mask\` field and updated the RPC signature:

\`\`\`proto
message PatchEmissionRequest {
  EmissaoCompleta emissao = 1;
  google.protobuf.FieldMask field_mask = 2;
}

rpc PatchEmission (PatchEmissionRequest) returns (EmissaoCompleta) {}
\`\`\`

**repo-1:** the main logic. the service stopped overwriting everything and started iterating the paths declared in the mask. I removed a guard that was blocking records in certain states without sufficient reason, and added a new one to protect what genuinely shouldn't be edited.

**repo-2:** the BFF that mediates between the frontend and repo-1. the route changed from \`PUT .../patch\` to \`PATCH .../{id}\` (without the redundant suffix), and I updated the decoder to build the request with the mask.

**repo-3:** which is an automatic renewal service. when a field is updated via patch, the renew service needs to know, because when it generates the next renewal, it'll use the source record's data as a base. I implemented the propagation via Kafka event and the inheritance in the automatic creation.

## the part that wasn't trivial

the gRPC contract changed, it's a breaking change. \`repo-2\` would stop compiling if it tried to use the new kit without being updated. the deploy order matters: kit first, then repo-1, then repo-2.

during development, to be able to test locally, I used Go's \`replace\` directive in \`go.mod\` to point the kit to the local path, without needing to publish a new version with every adjustment:

\`\`\`
replace github.com/sua-org/kit => ../kit
\`\`\`

staging kept using the old version. I only removed the \`replace\` when opening the PRs.

another non-trivial thing: the field mask serialization format over HTTP. the official protobuf JSON serializes \`FieldMask\` as a comma-separated string: \`"field_a,field_b"\`. but Go's \`encoding/json\` can't deserialize that automatically into the \`*fieldmaskpb.FieldMask\` type. result: the field mask arrived as \`nil\`, the loop didn't execute, and the backend returned 200 OK without saving anything.

the solution was to do the decode manually in both BFFs, reading \`field_mask\` as \`[]string\` and building the \`FieldMask\` by hand:

\`\`\`go
var raw struct {
    Resource  json.RawMessage \`json:"resource"\`
    FieldMask []string        \`json:"field_mask"\`
}
json.Unmarshal(body, &raw)

req.FieldMask = &fieldmaskpb.FieldMask{Paths: raw.FieldMask}
\`\`\`

## the applyFieldMask

the first approach I considered was using reflection aware of json tags to navigate the path automatically:

\`\`\`
"nested.field_d"
     ↓
navigates the struct to nested ⟶ field_d
copies only that field
\`\`\`

it seemed elegant, lower maintenance, simpler and honestly pretty readable. any new field would work without touching the code.

however, the final version uses an explicit switch with fixed cases for each supported field. as agreed with the team. (I'm the famous PM, just following orders), it got more verbose, but every allowed field is explicitly declared. any new field requires an addition to the switch, a bit of extra work, but that's fine right

the paths come in at the individual field level: \`"nested.field_d"\` updates only that field, not the entire object. I added nil guards at the top of the function to protect nested structs that might arrive empty from the database or from the request, avoiding panics in records imported with missing fields.

## testing was the best part

with the run-local running and [Bruno](https://usebruno.com/) (I use Bruno instead of Postman), testing was super easy: the existing record id goes in the URL, and in the body just the fields I want to change with the mask. just send it.

\`\`\`json
PATCH /v1/.../emissions/68abc123def456

{
  "resource": {
    "field_a": "new value"
  },
  "field_mask": ["field_a"]
}
\`\`\`

immediate response, field updated, the rest intact. simple. beautiful. best decision.

it took some work. I won't go into detail about the 30 commits per repo. but it was worth it.

## the result

the endpoint became a real \`PATCH\`. the front sends only what changed, with the explicit list of what can be touched. the backend guesses nothing, it reads the list and applies it.

\`\`\`
before:
PUT .../patch
body: entire object (always, regardless of what changed)
behavior: overwrites everything

after:
PATCH .../{id}
body: only the changed fields + field_mask with the paths
behavior: updates only what was declared
\`\`\`

every field that can be updated is explicitly declared in the switch. if it's not there, it doesn't get updated. by design. because my head wanted it that way. and that's that.

    `,
  date: '2025-04-20',
  readTime: 8,
  tags: ['protobuf', 'golang', 'microservices'],
  gopher: '/images/GOPHER_LAPTOP.png',
}
