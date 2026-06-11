import type { Post } from './types'

export const post: Post = {
  slug: 'defer-go',
  title: 'quando a ordem do defer virou um bug silencioso',
  title_en: 'when defer order became a silent bug',
  excerpt: 'Como um bug silencioso de ordem de execução com defer e middlewares empilhados no Go me fez investigar por horas... e no final a correção foram duas linhas trocadas de lugar.',
  excerpt_en: 'How a silent execution-order bug with defer and stacked middlewares in Go had me investigating for hours, and in the end the fix was just two lines swapped.',
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
5. defer do QueueingMiddleware roda ⟶ publica no Kafka ← PRIMEIRO ❌
6. defer do IndexingMiddleware roda ⟶ indexa no ES ← SEGUNDO (tarde demais)
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
✦ [Go spec: Defer statements](https://go.dev/ref/spec#Defer_statements)
✦ [Tour do Go: Defer](https://go.dev/tour/flowcontrol/12)
✦ [Effective Go: Defer](https://go.dev/doc/effective_go#defer)

E por último e menos relevante: a palavra \`defer\` foi usada exatamente 48 vezes no total. Eu avisei.
    `,
  content_en: `## What is \`defer\` in Go?

If you're getting started with Go, you've probably already seen \`defer\` being used to close files, database connections, or release resources. The idea is simple: **defer postpones the execution of a function to the moment the surrounding function returns**.

\`\`\`go
func readFile() {
    f, _ := os.Open("file.txt") // error ignored for simplicity
    defer f.Close() // will run when readFile() returns
    // ... does things with the file
}
\`\`\`

Simple enough, right? But there's a detail that can make you spend hours debugging a silent bug, and that's exactly what happened to me.

Important note before you start reading: the word \`defer\` will be repeated countless times. I hope you don't mind.

## The rule everyone forgets: LIFO

When you have **multiple defers** in a function, they execute in reverse order: **LIFO (Last In, First Out)**. The last \`defer\` registered is the first to run.

\`\`\`go
func example() {
    defer fmt.Println("first defer")  // runs last
    defer fmt.Println("second defer") // runs second
    defer fmt.Println("third defer")  // runs first
}

// Output:
// third defer
// second defer
// first defer
\`\`\`

It even makes sense when you see it like this. But what about when the defers are hidden inside stacked middlewares?

The emphasis on middleware is because that's where the bug showed up, but \`defer\` itself has nothing special about being inside a middleware. You can put \`defer\` in any Go function.

What made the bug subtle is that the defers were **hidden**, you didn't see two \`defer\` statements in the same function, you saw two middlewares being applied in sequence. It looked like normal initialization code, not two deferred calls competing in order.

If it were all in one function, it would be obvious, as we already saw, but let me reinforce it:

\`\`\`go
func operation() {
    defer publishKafka() // runs second
    defer indexElastic() // runs first
}
\`\`\`

But spread across separate middlewares, the connection between the order of application and the order of \`defer\` execution becomes invisible.

## The bug that only showed up in the morning

At work, we have a dashboard that shows relevant data to clients. The problem: **the day's changes only appeared on the dashboard in the morning**, after a full re-index that runs via CLI every night. No error logs, nothing broke, but this infuriating delay was there.

During the day, when a user action happened (create, update, delete) inside the platform, the dashboard was out of date. The next day, everything matched up.

I spent a good amount of time investigating: Redis with an old cache that wasn't updating? Race condition in Elasticsearch (ES)? Incorrect data? Divergence between the fields the dashboard was fetching compared to the export? (the export was my source of truth, so I kept comparing the two)

The answer was in the **order of the middlewares**.

## Middlewares as onion layers

The architecture uses the pattern of stacked middlewares, each one wraps the service and adds behavior via \`defer\`:

\`\`\`go
// IndexingMiddleware: indexes the record in Elasticsearch after each operation
func (mw indexingMiddleware) PostRecord(ctx context.Context, c *store.Record) (err error) {
    defer func() {
        if err == nil {
            mw.indexElastic(ctx, c) // updates ES
        }
    }()
    return mw.next.PostRecord(ctx, c)
}

// QueueingMiddleware: publishes event to Kafka after each operation
func (mw queueingMiddleware) PostRecord(ctx context.Context, c *store.Record) (err error) {
    defer func() {
        if err == nil {
            mw.producer.SendMessage(ctx, ...) // notifies the dashboard via Kafka
        }
    }()
    return mw.next.PostRecord(ctx, c)
}
\`\`\`

And the service initialization looked like this:

\`\`\`go
svc = QueueingMiddleware(config.Kafka)(svc)        // applied first
svc = IndexingMiddleware(config.ElasticSearch)(svc) // applied second
\`\`\`

Looks like Indexing runs first, right? **Wrong :)**

## Why the order of application matters

When you apply middlewares like this, you're creating layers:

\`\`\`
IndexingMiddleware (outermost layer)
  └── QueueingMiddleware (inner layer)
        └── service (core)
\`\`\`

The last middleware applied becomes the **outermost layer**. And since \`defer\` is LIFO, the \`defer\` in the outermost layer runs **last**.

So the actual flow was:

\`\`\`
1. IndexingMiddleware receives the call
2. Passes to QueueingMiddleware
3. QueueingMiddleware passes to the service
4. Service executes and returns
5. QueueingMiddleware's defer runs ⟶ publishes to Kafka ← FIRST ❌
6. IndexingMiddleware's defer runs ⟶ indexes in ES ← SECOND (too late)
\`\`\`

The dashboard received the Kafka event, went to fetch from Elasticsearch, and found the **previous** data because ES hadn't been updated yet.

## The complete flow to understand the impact

Kafka here doesn't carry the record's data, it's just a **notification**: "hey, this record changed, go fetch the updated data". To make it a bit clearer:

[iframe](/images/defer_antes_blog_theme_en.svg)

[iframe](/images/defer_depois_blog_theme_en.svg)

## The fix: two lines

\`\`\`go
// before (wrong)
svc = QueueingMiddleware(config.Kafka)(svc)
svc = IndexingMiddleware(config.Elasticsearch)(svc)

// after (correct)
svc = IndexingMiddleware(config.Elasticsearch)(svc)
svc = QueueingMiddleware(config.Kafka)(svc)
\`\`\`

Two lines swapped. Hours of investigation. Clonazepam as a companion. I had asked Claude, GPT, ALL THE AI ENTITIES and none of them knew. For it to end up being something this silly.

## What to learn from this

✦ \`defer\` is LIFO: the last one registered is the first to execute
✦ When middlewares use \`defer\` to execute post-call logic, **the composition order defines the execution order**: the outermost one runs last. Without \`defer\`, the outermost middleware's logic runs first, on the way in. It's worth understanding how your specific architecture stacks those calls, because the impact of LIFO depends on that
✦ Silent ordering bugs are the hardest to find because nothing "visibly" breaks. The system keeps working, but with wrong behavior.
✦ Strategic logs at key points in the flow are your best friends in these cases

If you want to dive deeper into \`defer\` behavior in Go:
✦ [Go spec -- Defer statements](https://go.dev/ref/spec#Defer_statements)
✦ [Tour of Go -- Defer](https://go.dev/tour/flowcontrol/12)
✦ [Effective Go -- Defer](https://go.dev/doc/effective_go#defer)

And last and least relevant: the word \`defer\` was used exactly 48 times in total. I warned you.
    `,
  date: '2026-05-24',
  readTime: 12,
  tags: ['defer', 'golang', 'learning'],
  gopher: '/images/DEATH_METAL_GOPHER.png',
}
