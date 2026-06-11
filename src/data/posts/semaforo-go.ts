import type { Post } from './types'

export const post: Post = {
  slug: 'semaforo-go',
  title: 'quando o semáforo não semafora: confundindo tamanho com limite no Go',
  title_en: 'when the semaphore doesn\'t semaphore: confusing size with limit in Go',
  excerpt: 'no meio de um bloco de código, um falso controle de concorrência.',
  excerpt_en: 'in the middle of a block of code, a false concurrency control.',
  content: `![semaforo demo](/images/semaforo_go.gif)

## o código suspeito

Revisando um código Go outro dia, me deparei com um padrão que parecia correto mas não fazia nada. Era algo assim:

\`\`\`go
sem := make(chan struct{}, len(items))

for _, item := range items {
    sem <- struct{}{}
    go func(i *Item) {
        defer func() { <-sem }()
        // processa...
    }(item)
}
\`\`\`

O comentário dizia: _"using len(items) as the concurrency limit"_.

aha moment: não estava limitando nada.

## goroutines e o problema de volume

Goroutines são leves - o runtime do Go aguenta milhares delas sem reclamar. O problema não é o número em si, mas o que cada uma faz: abrir conexão com banco, fazer chamada HTTP, ler arquivo. Esses recursos têm limite, e lançar 500 goroutines ao mesmo tempo pra cada uma abrir uma conexão com o banco vai estourar o pool.

É aí que entra o semáforo: não pra limitar goroutines porque são "pesadas", mas pra controlar a pressão nos recursos externos.

## o que é um semáforo?

Semáforo é um jeito de controlar **quantas goroutines rodam ao mesmo tempo**. Em Go, implementa com channel:

\`\`\`go
sem := make(chan struct{}, 5)  // só 5 de uma vez
\`\`\`

Funciona como catraca: antes de entrar, pega uma ficha. Quando sai, devolve. Se não tem ficha, espera.

\`\`\`go
sem <- struct{}{} // pega ficha (bloqueia se cheio)
go func() {
    defer func() { <-sem }() // devolve ficha ao terminar
    processa()
}()
\`\`\`

Com \`5\` slots: só 5 goroutines rodam ao mesmo tempo. A 6ª espera uma terminar.

## o bug sutil

Voltando ao código original:

\`\`\`go
sem := make(chan struct{}, len(items)) // ex: 10 items = 10 slots
\`\`\`

Se tem 10 items e o canal tem 10 slots, as 10 goroutines entram sem bloquear nenhuma vez. O semáforo tem fichas pra todo mundo simultaneamente - nunca fica cheio.

É matematicamente impossível ele bloquear qualquer goroutine. O GIF acima mostra isso na prática: com \`len(items)\` todos os workers disparam juntos; com \`5\` fixo eles saem em grupos.

## a confusão

O raciocínio foi: "vou usar o tamanho da lista como limite de concorrência".

Mas \`len(items)\` é o **total de trabalho**, não o **limite de workers**. São coisas diferentes:

| o quê | Significado |
|---|---|
| \`len(items)\` | quantas coisas tenho pra processar |
| tamanho do canal | quantas processo ao mesmo tempo |

Se quer limitar a 5 concorrentes:

\`\`\`go
sem := make(chan struct{}, 5) // fixo, independente do volume
\`\`\`

Se não quer limitar (volume pequeno por design), remove o canal e fica só com \`sync.WaitGroup\`:

\`\`\`go
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func(i *Item) {
        defer wg.Done()
        processa(i)
    }(item)
}
wg.Wait()
\`\`\`

Honesto com a intenção real.

## bônus: semáforo com errgroup

Se você também precisa propagar erros das goroutines, o pacote \`golang.org/x/sync/errgroup\` tem suporte nativo a semáforo com \`SetLimit\`:

\`\`\`go
g, ctx := errgroup.WithContext(context.Background())
g.SetLimit(5) // máximo 5 goroutines simultâneas

for _, item := range items {
    item := item
    g.Go(func() error {
        return processa(ctx, item)
    })
}

if err := g.Wait(); err != nil {
    // trata erro
}
\`\`\`

\`g.Go\` bloqueia automaticamente quando o limite é atingido - sem gerenciar canal na mão. E se qualquer goroutine retornar erro, \`ctx\` é cancelado, avisando as outras.

Um detalhe importante: com \`errgroup\` é impossível cometer o mesmo bug acidentalmente. \`SetLimit\` recebe um número fixo -não tem como passar \`len(items)\` sem que pareça errado na hora de escrever.

## moral da história

Código que parece que controla algo mas não controla é pior do que código sem controle nenhum - porque passa confiança falsa pra quem lê depois.

✦ \`len(items)\` como tamanho de semáforo = nenhum limite
✦ limite real = número fixo, independente do volume de trabalho
✦ sem erros: canal + WaitGroup; com erros: \`errgroup.SetLimit\`
    `,
  content_en: `![semaforo demo](/images/semaforo_go.gif)

## the suspicious code

Reviewing some Go code the other day, I ran into a pattern that looked correct but did nothing. It was something like this:

\`\`\`go
sem := make(chan struct{}, len(items))

for _, item := range items {
    sem <- struct{}{}
    go func(i *Item) {
        defer func() { <-sem }()
        // process...
    }(item)
}
\`\`\`

The comment said: _"using len(items) as the concurrency limit"_.

aha moment: it wasn't limiting anything.

## what is a semaphore?

A semaphore is a way to control **how many goroutines run at the same time**. In Go, you implement it with a channel:

\`\`\`go
sem := make(chan struct{}, 5) // only 5 at a time
\`\`\`

It works like a turnstile: before entering, grab a token. When done, return it. If there are no tokens, wait.

\`\`\`go
sem <- struct{}{} // grab token (blocks if full)
go func() {
    defer func() { <-sem }() // return token when done
    process()
}()
\`\`\`

With \`5\` slots: only 5 goroutines run simultaneously. The 6th waits for one to finish.

## the subtle bug

Back to the original code:

\`\`\`go
sem := make(chan struct{}, len(items)) // e.g. 10 items = 10 slots
\`\`\`

If you have 10 items and the channel has 10 slots, all 10 goroutines enter without ever blocking. The semaphore has tokens for everyone simultaneously -it never fills up.

It's mathematically impossible for it to block any goroutine. The GIF above shows this in practice: with \`len(items)\` all workers fire at once; with a fixed \`5\` they come out in groups.

## the confusion

The reasoning was: _"I'll use the list size as the concurrency limit"_.

But \`len(items)\` is the **total work**, not the **worker limit**. Those are different things:

| what | Meaning |
|---|---|
| \`len(items)\` | how many things I have to process |
| channel size | how many I process at the same time |

If you want to limit to 5 concurrent:

\`\`\`go
sem := make(chan struct{}, 5) // fixed, regardless of volume
\`\`\`

If you don't want to limit (small volume by design), remove the channel and just use \`sync.WaitGroup\`:

\`\`\`go
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func(i *Item) {
        defer wg.Done()
        process(i)
    }(item)
}
wg.Wait()
\`\`\`

Honest about the real intent.

## bonus: semaphore with errgroup

If you also need to propagate errors from goroutines, the \`golang.org/x/sync/errgroup\` package has native semaphore support via \`SetLimit\`:

\`\`\`go
g, ctx := errgroup.WithContext(context.Background())
g.SetLimit(5) // max 5 simultaneous goroutines

for _, item := range items {
    item := item
    g.Go(func() error {
        return process(ctx, item)
    })
}

if err := g.Wait(); err != nil {
    // handle error
}
\`\`\`

\`g.Go\` automatically blocks when the limit is reached -no manual channel management. And if any goroutine returns an error, \`ctx\` is canceled, notifying the others.

One important detail: with \`errgroup\` it's impossible to make the same mistake accidentally. \`SetLimit\` takes a fixed number -there's no way to pass \`len(items)\` without it looking wrong the moment you write it.

## moral of the story

Code that looks like it controls something but doesn't is worse than code with no control at all -because it gives false confidence to whoever reads it later.

✦ \`len(items)\` as semaphore size = no limit
✦ real limit = fixed number, independent of work volume
✦ no errors: channel + WaitGroup; with errors: \`errgroup.SetLimit\`
    `,
  date: '2026-06-10',
  readTime: 5,
  tags: ['go', 'concurrency', 'backend'],
  gopher: '/images/PINK_GOPHER.png',
}
