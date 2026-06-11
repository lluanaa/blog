import type { Post } from './types'

export const post: Post = {
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
  gopher: '/images/GOPHER_MIC_DROP.png',
}
