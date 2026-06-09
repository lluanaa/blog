export interface Post {
  slug: string
  title: string
  title_en?: string
  excerpt: string
  excerpt_en?: string
  content: string
  content_en?: string
  date: string
  readTime: number
  tags: string[]
  featured?: boolean
  accent?: string // decorative symbol
}

export const posts: Post[] = [
  {
    slug: 'datas-em-go',
    title: 'datas em Go: por que 2006-01-02 não é uma data, é um template',
    title_en: 'dates in Go: why 2006-01-02 is not a date, it\'s a template',
    excerpt: 'Go não usa %Y, %m, %d como outras linguagens. Ele usa uma data de referência específica como molde. Parece estranho no começo, mas é simples e poderoso.',
    excerpt_en: 'Go doesn\'t use %Y, %m, %d like other languages. It uses a specific reference date as a template. Feels weird at first, but it\'s simple and powerful.',
    content: `![go dates demo](/images/go_dates.gif)

## a data mágica

Se você já tentou formatar uma data em Go e se deparou com \`"2006-01-02T15:04:05Z07:00"\`, provavelmente pensou: isso é uma data de verdade ou o dev que colocou isso ficou maluco?

É um template. E tem uma lógica por trás.

Go usa uma **data de referência fixa** para formatação: \`Mon Jan 2 15:04:05 MST 2006\`. Cada parte dessa data representa um componente de tempo com um valor específico e único:

\`\`\`
2006  ⟶ ano
01    ⟶ mês (com zero à esquerda)
02    ⟶ dia (com zero à esquerda)
15    ⟶ hora (formato 24h)
04    ⟶ minuto
05    ⟶ segundo
Z07:00 ou MST ⟶ timezone
\`\`\`

A ideia é: em vez de usar símbolos como \`%Y\`, \`%m\`, \`%d\` (como C, Python, PHP), você escreve como quer que a data apareça usando **esses valores exatos** como referência. O Go reconhece cada número e sabe o que substituir.

## por que esses números?

Não é aleatório. A data de referência é **01/02 03:04:05 2006** - ou seja, 1, 2, 3, 4, 5, 6 em sequência. É fácil de memorizar quando você vê assim:

\`\`\`
mês=1, dia=2, hora=3, minuto=4, segundo=5, ano=6
\`\`\`

A hora aparece como \`15\` (não \`03\`) quando você quer formato 24h, porque 15:04 é o mesmo instante que 3:04 PM.

## comparando com outras linguagens

A maioria das linguagens usa o padrão **strftime**, que veio do C. Em vez de uma data de referência, você usa símbolos como \`%Y\` para ano, \`%m\` para mês, \`%d\` para dia:

\`\`\`python
datetime.now().strftime("%Y-%m-%d %H:%M:%S")
# → "2026-06-09 21:30:45"
\`\`\`

\`\`\`php
date("d/m/Y", time());
// → "09/06/2026"
\`\`\`

\`\`\`ruby
Time.now.strftime("%d/%m/%Y")
# → "09/06/2026"
\`\`\`

O problema é que você precisa decorar que \`%Y\` = ano, \`%m\` = mês, \`%H\` = hora (24h), \`%I\` = hora (12h)... são símbolos arbitrários.

Go trocou os símbolos pela data de referência. Em vez de \`%Y\`, você escreve \`2006\`. Em vez de \`%m\`, você escreve \`01\`. A lógica fica explícita no próprio template.

## formatando na prática

\`\`\`go
t := time.Now()

fmt.Println(t.Format("2006-01-02"))
// 2026-06-09

fmt.Println(t.Format("02/01/2006"))
// 09/06/2026

fmt.Println(t.Format("2 de January de 2006"))
// 9 de June de 2026

fmt.Println(t.Format("15:04"))
// 21:30
\`\`\`

Percebe? Você não usa símbolos, você literalmente escreve o formato usando os valores de referência no lugar onde quer cada componente.

## parsing: lendo uma string como data

O mesmo template funciona para converter string em \`time.Time\`:

\`\`\`go
raw := "2026-06-09"

t, err := time.Parse("2006-01-02", raw)
if err != nil {
    return err
}

fmt.Println(t) // 2026-06-09 00:00:00 +0000 UTC
\`\`\`

O template que você passa pro \`Parse\` precisa bater exatamente com o formato da string. Se a string tem barra e o template tem hífen, vai dar erro.

## formatos prontos

Go já vem com alguns formatos comuns definidos como constantes em \`time\`:

\`\`\`go
time.RFC3339     // "2006-01-02T15:04:05Z07:00"
time.RFC3339Nano // "2006-01-02T15:04:05.999999999Z07:00"
time.DateTime    // "2006-01-02 15:04:05"
time.DateOnly    // "2006-01-02"
time.TimeOnly    // "15:04:05"
\`\`\`

São só strings, você pode usá-los direto no \`Format\` e \`Parse\`:

\`\`\`go
t.Format(time.RFC3339)
// "2026-06-09T21:30:00Z"
\`\`\`

## exemplo real

Precisei corrigir datas erradas num documento. O problema era que **dois grupos de campos no mesmo documento esperavam formatos diferentes** - e eu só percebi isso quando fui ver o schema de perto.

O mesmo documento, dois grupos de campos, dois formatos diferentes. Quando fui corrigir, precisei usar o certo para cada um:

\`\`\`go
const msFormat = "2006-01-02T15:04:05.999Z07:00"

correctStart := time.Date(2026, 5, 26, 22, 59, 59, 999000000, time.UTC)
correctEnd   := time.Date(2030, 5, 26, 22, 59, 59, 999000000, time.UTC)

_, err = col.UpdateOne(ctx,
    bson.M{"_id": docID},
    bson.M{"$set": bson.M{
        "contract.start": correctStart.Format(time.RFC3339),
        "contract.end":   correctEnd.Format(time.RFC3339),
        // → "2026-05-26T22:59:59Z"

        "order.start": correctStart.Format(msFormat),
        "order.end":   correctEnd.Format(msFormat),
        // → "2026-05-26T22:59:59.999Z"
    }},
)
\`\`\`

O \`.999\` no template não é um número aleatório - é a forma do Go representar milissegundos. Se você usar \`.000\`, ele sempre imprime três dígitos. Com \`.999\`, ele omite zeros à direita.

## resumo

✦ Go usa uma data de referência (\`2006-01-02 15:04:05\`) no lugar de símbolos como \`%Y\`
✦ \`Format\` transforma \`time.Time\` em string, \`Parse\` faz o caminho contrário
✦ O template do \`Parse\` precisa bater exatamente com o formato da string
✦ Formatos comuns já estão disponíveis como constantes em \`time\`
✦ \`.999\` no template = milissegundos sem zeros à direita, \`.000\` = sempre três dígitos

Parece estranho quando você vê pela primeira vez. Mas quando decora que é só 1, 2, 3, 4, 5, 6 - nunca mais erra.
    `,
    content_en: `![go dates demo](/images/go_dates.gif)

## the magic date

If you've ever tried to format a date in Go and came across \`"2006-01-02T15:04:05Z07:00"\`, you probably thought: is this a real date or was the previous dev drunk?

It's a template. And there's logic behind it.

Go uses a **fixed reference date** for formatting: \`Mon Jan 2 15:04:05 MST 2006\`. Each part of this date represents a time component with a specific, unique value:

\`\`\`
2006  ⟶ year
01    ⟶ month (zero-padded)
02    ⟶ day (zero-padded)
15    ⟶ hour (24h format)
04    ⟶ minute
05    ⟶ second
Z07:00 or MST ⟶ timezone
\`\`\`

The idea: instead of using symbols like \`%Y\`, \`%m\`, \`%d\` (like C, Python, PHP), you write how you want the date to look using **those exact values** as a reference. Go recognizes each number and knows what to substitute.

## why these numbers?

It's not random. The reference date is **01/02 03:04:05 2006** - that is, 1, 2, 3, 4, 5, 6 in sequence. Easy to memorize when you see it like that:

\`\`\`
month=1, day=2, hour=3, minute=4, second=5, year=6
\`\`\`

The hour appears as \`15\` (not \`03\`) when you want 24h format, because 15:04 is the same moment as 3:04 PM.

## comparing with other languages

Most languages use the **strftime** standard, which came from C. Instead of a reference date, you use symbols like \`%Y\` for year, \`%m\` for month, \`%d\` for day:

\`\`\`python
datetime.now().strftime("%Y-%m-%d %H:%M:%S")
# → "2026-06-09 21:30:45"
\`\`\`

\`\`\`php
date("d/m/Y", time());
// → "09/06/2026"
\`\`\`

\`\`\`ruby
Time.now.strftime("%d/%m/%Y")
# → "09/06/2026"
\`\`\`

The problem is you have to memorize that \`%Y\` = year, \`%m\` = month, \`%H\` = hour (24h), \`%I\` = hour (12h)... they're arbitrary symbols.

Go replaced symbols with the reference date. Instead of \`%Y\`, you write \`2006\`. Instead of \`%m\`, you write \`01\`. The logic is explicit in the template itself.

## formatting in practice

\`\`\`go
t := time.Now()

fmt.Println(t.Format("2006-01-02"))
// 2026-06-09

fmt.Println(t.Format("01/02/2006"))
// 06/09/2026

fmt.Println(t.Format("January 2, 2006"))
// June 9, 2026

fmt.Println(t.Format("15:04"))
// 21:30
\`\`\`

See? You don't use symbols - you literally write the format using the reference values in place of each component.

## parsing: reading a string as a date

The same template works for converting a string into \`time.Time\`:

\`\`\`go
raw := "2026-06-09"

t, err := time.Parse("2006-01-02", raw)
if err != nil {
    return err
}

fmt.Println(t) // 2026-06-09 00:00:00 +0000 UTC
\`\`\`

The template you pass to \`Parse\` needs to match the string's format exactly. If the string has slashes and the template has hyphens, it'll error.

## ready-made formats

Go ships with some common formats defined as constants in \`time\`:

\`\`\`go
time.RFC3339     // "2006-01-02T15:04:05Z07:00"
time.RFC3339Nano // "2006-01-02T15:04:05.999999999Z07:00"
time.DateTime    // "2006-01-02 15:04:05"
time.DateOnly    // "2006-01-02"
time.TimeOnly    // "15:04:05"
\`\`\`

They're just strings, you can use them directly in \`Format\` and \`Parse\`:

\`\`\`go
t.Format(time.RFC3339)
// "2026-06-09T21:30:00Z"
\`\`\`

## real example:

I had to fix wrong dates in a document. The problem was that **two groups of fields in the same document expected different formats** - I only noticed when I looked at the schema closely.

Same document, two groups of fields, two different formats. When fixing it, I had to use the right one for each:

\`\`\`go
const msFormat = "2006-01-02T15:04:05.999Z07:00"

correctStart := time.Date(2026, 5, 26, 22, 59, 59, 999000000, time.UTC)
correctEnd   := time.Date(2030, 5, 26, 22, 59, 59, 999000000, time.UTC)

_, err = col.UpdateOne(ctx,
    bson.M{"_id": docID},
    bson.M{"$set": bson.M{
        "contract.start": correctStart.Format(time.RFC3339),
        "contract.end":   correctEnd.Format(time.RFC3339),
        // → "2026-05-26T22:59:59Z"

        "order.start": correctStart.Format(msFormat),
        "order.end":   correctEnd.Format(msFormat),
        // → "2026-05-26T22:59:59.999Z"
    }},
)
\`\`\`

The \`.999\` in the template isn't a random number - it's how Go represents milliseconds. If you use \`.000\`, it always prints three digits. With \`.999\`, it omits trailing zeros.

## summary

✦ Go uses a reference date (\`2006-01-02 15:04:05\`) instead of symbols like \`%Y\`
✦ \`Format\` turns \`time.Time\` into a string, \`Parse\` does the reverse
✦ The \`Parse\` template needs to match the string's format exactly
✦ Common formats are already available as constants in \`time\`
✦ \`.999\` in the template = milliseconds without trailing zeros, \`.000\` = always three digits

Feels weird the first time you see it. But once you remember it's just 1, 2, 3, 4, 5, 6 - you never get it wrong again.
    `,
    date: '2026-06-09',
    readTime: 5,
    tags: ['go', 'backend'],
    featured: true,
  },
  {
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
  },

  {
    slug: 'merge-conflict',
    title: 'conflito de merge no GitHub == caos',
    title_en: 'merge conflict on GitHub == chaos',
    excerpt:
      'git diz que não consegue fazer o merge automático. você entra em pânico. este post é sobre não entrar em pânico. (mesmo eu entrando. hipocrisia)',
    excerpt_en: "git says it can't auto-merge. you panic. this post is about not panicking. (even though I did. hypocrite)",
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
    content_en: `As everyone knows, or if you don't, you're about to find out hehe, every company has its own *GitFlow*. Today I'm going to talk about surviving a *gitflow* that has only two environments: *staging* (pre-prod and dev) and *master* (prod), with a dev team.

## my biggest enemy: branch conflicts

When you use the *staging* environment, which should be just for pre-prod, as your dev and QA environment too, keeping everything stable gets more complicated. Even more so when deploy dates start slipping, messing with everything that comes after. If the team doesn't have someone responsible for tracking open *branches* daily, a lot of stuff ends up falling behind and turning into "garbage", polluting the environment.

NOTHING is worse than making your changes, committing, pushing, and then when you go to open the PR: **can't automatically merge**
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

I've worked at places with more environments, including one specifically for dev, and it still caused problems. So the real point is: individual and collective organization.

## why conflicts happen

*git* uses an algorithm called *3-way merge* to try to resolve changes automatically: it compares the common ancestor of the two *branches* with the current state of each one. If changes in the same section of code are in different *branches*, it tries to resolve on its own. Most of the time it manages. But when both *branches* modified the same section in different ways, without a clear ancestor to resolve it, it can't decide which version wins, and that's where the conflict comes from.

GitHub isn't the one resolving this. It just *shows* the result. The work is done by *git* locally, when you do the *merge*. What GitHub does when you open a PR is basically run that same analysis and let you know if there are sections it won't be able to resolve automatically.

In my view, it does a great job, because most of the time a conflict happens, I don't even know how to resolve it myself...

## tips to minimize conflicts

Zeroing them out is unfortunately impossible, but you can reduce them quite a bit:

Keep your *branch* always up to date. Before starting anything, I have a ritual: always *pull* from the source *branch*, create my *branch* from that, make *only* the necessary adjustments without going off and refactoring things that aren't part of the *ticket*, push it, and then manage the dates. QA tested and sent it to *deploy*? I immediately push the *branch* to *master* and close the PR.

Critical point: unfortunately you can't do this for your teammates. So yes, there will be old branches sitting open, branches that never got pushed, branches you have absolutely no idea what happened to. But relax, everything gets resolved with communication. "what if the person isn't at the company anymore?" delete their branch and pretend it never happened :D
just kidding. don't do that.

When it's something I genuinely don't know how to resolve, I ask for help. Asking for help won't kill you, it doesn't hurt. Every conflict has a way to be resolved.

## hunting down the guilty branch

In my case, the process is: conflict in some file? first I identify what's conflicting with my *branch*:

\`\`\`bash
git fetch origin
git log origin/staging..HEAD --oneline
\`\`\`

Or if I want to see which files are conflicting *before* attempting the *merge*:

\`\`\`bash
git diff origin/staging...HEAD --name-only
\`\`\`

With that you can identify who touched the same files. Then the conversation is direct: "hey, your changes are conflicting with mine, can we sync up before pushing?"

## the classic mistake: merging staging into your branch

When the conflict is in my own old *branch* (the classic "I already merged something of mine into *staging* and now I have a new *branch* based on *master*"), the temptation is to do a \`merge origin/staging\` into your *branch* to "update" it. **don't do that.**

*staging* in our flow is an integration and validation environment, not the source of truth for the code. Merging *staging* into your *branch* is dangerous:

✦ **you pull in code that shouldn't be in *master* yet.** it might have a teammate's *feature* that hasn't been approved, is still in QA, or might get reverted. now it's in your *branch*.
✦ **domino effect on *deploy*.** if your *branch* goes up to *master* carrying that code along with it, your teammate's *feature* goes with it, no review, no approval, by accident.
✦ **the history becomes a mess.** it becomes impossible to trace what came from where, and reverting turns into a nightmare.

The solution we found where I work is: create a **tertiary resolution branch** from your own *branch*, which already has *master* as its base, and bring the conflicting one into it:

\`\`\`bash
git checkout minha-feature-nova
git checkout -b fix/resolve-conflito-minha-feature
git merge branch-que-deu-conflito
# resolve the conflicts here calmly
git push origin fix/resolve-conflito-minha-feature
# open PR from this branch -> staging for validation
\`\`\`

*Is it the right approach? I dunno, but it's what's working right now. so that's how I'm going to keep doing it until we have a definitive, simpler solution, lol.*

This way, you keep the scope of your original *branch* clean, without carrying anything that isn't yours. The tertiary branch exists only to isolate the conflict resolution, once it goes into *staging*, its job is done.

One thing I noticed in practice: after the tertiary branch goes up to *staging* and the conflicting branch comes in with it, most of the time when I go back to my original branch and open the PR to *staging*... the conflict is gone. After doing a bit of research, it makes sense: what happens is that *git* now has a **more recent common ancestor** between my branch and staging after the tertiary. The merge algorithm can resolve automatically because the divergence point changed, it already knows where the two histories split apart, and since the conflict resolution was recorded at that point, there's nothing left to conflict. I just accept the gift and move on.
*an attempt at a visual explanation of all this*:

![merge diagram with tertiary branch](/images/git_merge_blog_theme_en.svg)

## how I resolve it in practice

when a conflict shows up inside the tertiary branch and I have to sit down and resolve it file by file, I use **VS Code** itself. it highlights conflicts with "Accept Current / Accept Incoming / Accept Both" buttons and you can see the diff side by side. for me it's the most visual and least stressful, especially when the file is large and has multiple conflicting sections at the same time.

there's also \`git checkout --ours\` and \`--theirs\`, which are useful when the conflict is simple and you know exactly which version wins without even needing to look at the diff properly:

\`\`\`bash
git checkout --ours src/arquivo-conflitante.go   # keeps your version
git checkout --theirs src/arquivo-conflitante.go # keeps the version that came from the merge
\`\`\`

but I use these very carefully, especially with *staging*. "taking theirs" in a conflict with staging means taking what's in the integration environment, and as we've already seen, staging might have a teammate's code that hasn't gone up to master yet. if I do that without checking, I import a problem without even noticing.

so my flow is: VS Code to visualize, \`--ours\` or \`--theirs\` only when I'm sure of what I'm choosing, and always a read-through of the final diff before committing. no resolving conflicts on autopilot and hoping for the best.

## final tips

✦ always *pull* from the source *branch* before creating yours
✦ don't refactor things that aren't part of the *ticket*
✦ ask for help when you don't know how to resolve something
✦ never *merge* the unstable branch containing unapproved changes into *your* branch. whether it's the conflicting one or not

and most importantly: when a conflict shows up, breathe, hunt down the guilty *branch*, talk to whoever you need to, and resolve it calmly. **most conflicts are solvable in 15 minutes with the right person by your side.**

*perfect gitflow* doesn't exist. a communicative and minimally organized team does.

*(coming soon: what messes up git history, and what doesn't. there's more to it than you'd think.)*
    `,
    date: '2025-04-28',
    readTime: 8,
    tags: ['git', 'workflow', 'dev life'],
  },
  {
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
  },
  {
    slug: '3-anos-como-dev',
    title: '3 anos como dev',
    title_en: '3 years as a dev',
    excerpt:
      'Da garçonete que subiu os projetos no GitHub às 21h um dia antes da entrevista até hoje: o que aprendi, o que ainda me frustra, e por que eu sigo.',
    excerpt_en: 'From the waitress who pushed her projects to GitHub at 9pm the night before the interview, to today: what I learned, what still frustrates me, and why I keep going.',
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
    content_en: `when I got into programming it was a whole thing.

I was studying programming and related stuff because of college, but it was all very abstract. I'd work on a project here and there, nothing too serious, without really absorbing much. my head was always full, because of the two jobs I had.

the opportunity didn't just appear out of nowhere. I went after it. I spent a loooong time looking for a job. it was 2023, I sent so many resumes that I'm probably in the talent database of 90% of companies in Brazil.

until I got an interview. with the owner of the company himself, where I was living. it was 9pm on a Thursday and he asked me to push the projects I had on GitHub so he could take a look. I didn't think twice, I pushed everything I had (it wasn't much). I was at my waitressing job, it was a calm day, I grabbed my laptop and pushed what I had. anxious, because the interview was the next day.

I showed up there not knowing what to expect, after all it was my first dev interview. the guy started asking me what I had worked with, what I knew. I told him everything (zero preparation). then he told me the position was for Java on the backend, part of the front with JSF and another part in React, among other languages and databases. I froze, because I had failed OOP in college and I knew Java was complex. ESPECIALLY FOR SOMEONE WHO KNEW NOTHING.

I don't know how, but he told me to start the following week.

I thanked him a lot and left in disbelief. the salary was less than what I was making, I'd be starting as an intern, in-person. but, regardless: it was the first time I'd gotten a yes in programming.

I thought it was going to be hard. it was harder than I thought. LMAOOOOOOO

in the first few weeks I was so lost. so lost... luckily, I had a coworker who was so kind and patient that I could ask the dumbest possible thing and he'd answer. miss him, actually. I got along with everyone. over time I got the hang of it, asking a lot of questions, using GPT a bit when it was still terrible. but I always managed. I always went after it. 80 tabs open, a lot of research.

and it was during that time that I confirmed what I already felt: I was in the right place. that this was what I wanted.

I always wanted to work with something in this field. but as a teenager I only had contact with it when my brother would leave the house and I'd run to his PC to write scripts on Facebook to move all 5 thousand friends at once into the groups I was part of. I was so innocent and naive that I genuinely didn't know programming paid so well. so much so that when I got the internship, I was earning what any other university-level internship pays in my city.

anyway. time passed, I've dealt with various languages, various problems, various devs. and now it's already been 3 years.

and the questions never end. the main doubt I have right now is: am I mid-level or am I still junior?

for those who don't know, developers have levels, and salary is based on that. but what determines that you're mid-level? yourself? do people just come up and tell you? SOMEONE ANSWER ME

no jokes, the real talk is: there's no ruler. what I see most is: junior needs constant direction, mid-level can take a problem, investigate, and solve it alone, even without knowing everything. the difference isn't knowing more, it's knowing how to act on each problem. correctly, simply, practically. and looking back, I've been doing that for a while. but I'm not the only one. programming is a totally self-taught field. nobody's going to hold your hand and teach you to crawl, you have to figure it out yourself

but the title takes time to arrive, and that's okay. sometimes it's frustrating, yes. but I try to focus on my own progress without comparing myself to others.

either way, I keep going. happy, stressing out, learning, and waiting for my promotion. (hint hint)

I'm living a dream, and I need to thank myself for the courage. sometimes it's hard to recognize your own journey, and I, more than anyone, have a reaaaally hard time with that. I don't want to be arrogant, but I struggled to get here, and I know I deserve the good things this profession can offer. I know the struggle isn't over yet. but I'm excited for the next chapters.

and I'm certain of one thing: if I had gotten into programming just for the money, I would have quit in the first semester. today I'm still here, writing for a blog.

![eu](/images/girl%20blogging.jpeg)
    `,
    date: '2026-05-10',
    readTime: 5,
    tags: ['dev life', 'career', 'learning'],
  },
  {
    slug: 'run-local-refatoracao',
    title: 'orquestração local com Air e volume mounts',
    title_en: 'local orchestration refactored with Air and volume mounts',
    excerpt:
      'O run-local do meu trabalho era um caos: sem hot reload, repos duplicados, 20 docker-composes dessincronizados. Refatorei tudo com Air e volume mounts, e recebi vários elogios (1)',
    excerpt_en: "Our local dev setup was chaos: no hot reload, duplicated repos, 20 out-of-sync docker-composes. I refactored everything with Air and volume mounts, and received several compliments (1)",
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

  include_ext = ["go"]             # só reage a arquivos .go (ignora .yaml, .md, etc.)
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
nos logs: building... ⟶ running...
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

Antes: alterar código ⟶ parar container ⟶ rebuildar imagem inteira (~30-60s) ⟶ subir de novo ⟶ torcer pra funcionar. E ainda manter cópias sincronizadas.

Depois: salva o arquivo ⟶ Air detecta ⟶ recompila só o binário ⟶ \`running...\` em ~2 segundos. Os repos ficam onde sempre estiveram.

O mais satisfatório foi quando tudo ficou pronto. README subiu bonitinho, fui rodar a primeira vez e quase chorei de alegria. E fiquei ainda mais feliz quando meus colegas começaram a usar. Agora tudo está simples, fácil, intuitivo e rápido. 0 estresse. 
![feedback do colega sobre o run-local](/images/run_local_feedback.svg)
    `,
    content_en: `Before anything else: I'm not going to pretend it was something elegant and well-made (sorry to the ex-dev who created it). The *run-local* was a mess. COMPLETE chaos. My first impression was: oh my god, what is this (crying). What was supposed to be a local development tool was actually dead code. utterly useless.

To run anything locally, you had to **copy the entire repo into the run-local folder**. The result? Each project had its own \`docker-compose.yaml\`, and since you needed to run multiple projects, copies kept appearing. Lots of copies. About 20 copies of \`docker-compose.yaml\` scattered around in there.

And since I like to work separately on each project, I had to keep pasting changes into each one of those copies every time I needed to bring something up. IMPOSSIBLE. I was just constantly annoyed.

The worst part: there was absolutely zero *hot reload*. Changed the code? Tear everything down, rebuild the entire Docker image from scratch, bring it back up. For every change. In every service. Every single time. Seriously, people, this is unsustainable. But since everyone was very busy, the run-local got left behind, and things were tested directly in staging. I don't blame my colleagues, I got so fed up that I did the refactor in the middle of the night anyway.

I lost a few nights of sleep, but it was worth every minute. Genuinely. I think across my "entire" career, it was the best refactor I've ever done.

## the root problem

The old structure was basically this: each service had its own folder with duplicated code and its own \`docker-compose.yaml\` inside:

\`\`\`bash
run-local/
├── servico-a/
│   ├── ... (duplicated repo code)
│   └── docker-compose.yaml
├── servico-b/
│   ├── ... (duplicated repo code)
│   └── docker-compose.yaml
├── servico-c/
│   └── ...
└── ... (about ~18 others)
\`\`\`

Since everyone worked differently, some would push the updated code, others wouldn't. You had to remember to copy it to the clone in here. Nobody remembered. Everything got out of sync. It was as if the run-local was about 800 commits behind master.

## the solution: volume mounts + Air

The core idea is simple: **don't copy the code, mount it**.

*Volume mount* is a way to share a folder between your computer and the Docker container. Instead of copying each repo into the run-local, you tell Docker: "the \`~/projects/my-service\` folder on my computer and the \`/app\` folder in the container are the same thing". It's not a copy, it's the same directory. Any change you make in VS Code, or any other IDE, the container sees it instantly.

In the \`docker-compose.yaml\`:

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

The \`../meu-servico\` is relative to the run-local, meaning: \`~/projects/meu-servico\`. Each \`volumes\` line does something different:

◈ \`../meu-servico:/app\` mounts the real repo from your computer inside the container at the \`/app\` path. This is what enables *hot reload*: *Air* runs inside the container reading from \`/app\`, which is literally the same folder you're editing in VS Code.

◈ \`.air.toml:/app/.air.toml:ro\` injects the *Air* config file inside the container. The \`:ro\` is *read-only*: the container can read it but can't modify it.

◈ \`go-mod-cache:/go/pkg/mod\` is the Go module cache. Without this, every time the container restarted it would download all dependencies from scratch. With it, the download happens once and persists between restarts.

◈ \`go-build-cache:/root/.cache/go-build\` is the build cache. Makes subsequent builds faster because Go reuses what it already compiled before.

But volume mount alone doesn't solve *hot reload*. That's where *Air* comes in.

*Air* is a tool that lives inside the container watching \`.go\` files. When you save anything, it detects the change, recompiles just the binary (~2s) and restarts the process automatically. No rebuilding the image. No running \`make up\` again. No doing anything.

The config file lives in \`.docker.air/common-archives/.air.toml\` and is mounted via volume into all containers. No repo needs to have this file, the run-local injects it for everyone:

\`\`\`toml
root = "."        # where Air will look (/app in the container, which is your mounted repo)
tmp_dir = "tmp"   # temporary folder where the compiled binary is stored

[build]
  cmd = "go build -o ./tmp/server ./cmd/server/main.go"
  entrypoint = "tmp/server"  # bin is deprecated, use entrypoint

  include_ext = ["go"]             # only reacts to .go files -- ignores .yaml, .md, etc.
  exclude_dir = ["tmp", "vendor"]  # doesn't watch these folders (avoids loops)

  delay = 1000       # waits 1000ms after the last change before compiling
  stop_on_error = true

[log]
  time = true
\`\`\`

One limitation worth knowing: the \`cmd\` assumes the service's entry point is \`./cmd/server/main.go\`. If a repo ever uses \`cmd/api/main.go\` for example, *Air* will fail on build and you'll see it in the logs. Just adjust it here in the run-local, no need to touch the repo.

*Air* is open source: [github.com/air-verse/air](https://github.com/air-verse/air)

The complete flow looks like this:

\`\`\`
you save meu-servico/pkg/something/service.go
    ↓
volume mount already reflects the change in the container
    ↓
Air detects the .go file changed
    ↓
runs: go build -o ./tmp/server ./cmd/server/main.go
    ↓
kills the previous process, brings up the new binary
    ↓
in the logs: building... ⟶ running...
\`\`\`

The \`dockerfile: .docker.air/Dockerfile\` points to a single file shared by all services. Before, each one had its own, with no standard. Now there's just one:

\`\`\`dockerfile
FROM golang:1.25-alpine

RUN apk add git

RUN git config --global url."https://\${GIT_USER}:\${GIT_TOKEN}@github.com/sua-org".insteadOf "https://github.com/sua-org"

ENV GOPRIVATE=github.com/sua-org

WORKDIR /app

RUN go install github.com/air-verse/air@latest

CMD ["air", "-c", ".air.toml"]
\`\`\`

Generic by design: what differentiates one service from another is just the volume mount pointing to the right repo. The image itself is the same. The \`insteadOf\` only points to the company's org, not all of GitHub. it only intercepts private modules from that org, without affecting public dependencies from other places.

The image is built **once** on the first \`docker compose up\`. After that, never again, as long as you're only editing code.

## the script that generates the variables

There was another problem: environment variables. Each service needs to know the addresses of the others. In *staging* those are cluster IPs (\`10.x.x.x\`). Locally they're Docker container names (\`meu-servico:9090\`).

Before this was maintained manually. Someone would add a new service to the compose and forget to update the \`.env.local\`. The service would come up and keep trying to hit an IP that didn't exist.

The solution was a script that **reads the \`docker-compose.yaml\` and automatically generates the \`*_SERVICE_HOST\` lines** that need to go into \`.env.local\`:

\`\`\`bash
make gen-env
# output:
# SERVICO_A_SERVICE_HOST="servico-a:9090"
# SERVICO_B_SERVICE_HOST="servico-b:9090"
# SERVICO_C_SERVICE_HOST="servico-c:9090"
# ... all the others
\`\`\`

You don't need to run this every day. Only when adding a new service. But it eliminated the entire class of bugs where "new service came up but nobody updated the variables".

## final structure

\`\`\`
run-local/
├── .docker.air/
│   ├── Dockerfile                    <- base image with Air + Go
│   └── common-archives/
│       └── .air.toml                 <- shared Air config
├── scripts/
│   └── gen-local-env.sh
├── docker-compose.yaml
├── Makefile
└── README.md
\`\`\`

The repos stay in \`~/projects/\` separately. The run-local only orchestrates: it knows nothing about any service's code, it only knows where to find them.

## the result in practice

Before: change code, stop container, rebuild the entire image (~30-60s), bring it back up, hope it works. And still maintain synchronized copies.

After: save the file, Air detects it, recompiles just the binary, \`running...\` in ~2 seconds. The repos stay exactly where they always were.

The most satisfying moment was when everything was done. README went up looking nice, I went to run it for the first time and almost cried from joy. And I was even happier when my colleagues started using it. Now everything is simple, easy, intuitive and fast. 0 stress.
![colleague feedback about the run-local](/images/run_local_feedback_en.svg)
    `,
    date: '2026-05-09',
    readTime: 7,
    tags: ['docker', 'golang', 'workflow'],
  },
    {
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
  },
]

export const getPostBySlug = (slug: string) =>
  posts.find((p) => p.slug === slug)

export const getFeaturedPost = () => posts.find((p) => p.featured) ?? posts[0]

const RECENT_SLUGS = [
  'run-local-refatoracao',
  'defer-go',
  'field-mask',
  'query-timeout-sethint',
]

export const getRecentPosts = (_limit = 4) =>
  RECENT_SLUGS.map((s) => posts.find((p) => p.slug === s)).filter(Boolean) as Post[]
