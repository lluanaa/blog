import type { Post } from './types'

export const post: Post = {
  slug: 'fuzzing-go',
  title: 'fuzzing em Go',
  title_en: 'fuzzing in Go',
  excerpt: 'conhecendo o go test -fuzz, introduzido no Go 1.18, que gera inputs aleatórios automaticamente em vez de você escrever cada caso de teste na mão.',
  excerpt_en: 'getting to know go test -fuzz, introduced in Go 1.18, which generates random inputs automatically instead of you writing every test case by hand.',
  content: `
conheci essa semana o **fuzzing** (\`go test -fuzz\`), introduzido no Go 1.18. documentação oficial: [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz/) e o [tutorial oficial](https://go.dev/doc/tutorial/fuzz).

## o que é fuzzing

a [documentação oficial](https://go.dev/doc/security/fuzz/) resume bem:

> fuzzing é um tipo de teste automatizado que manipula continuamente os inputs de um programa pra encontrar bugs. o fuzzing do Go usa *coverage guidance* pra percorrer inteligentemente o código sendo testado e reportar falhas ao usuário. como ele consegue alcançar casos extremos que humanos costumam deixar passar, o fuzz testing pode ser particularmente valioso pra encontrar vulnerabilidades e brechas de segurança.

ou seja: em vez de você escrever os casos de teste manualmente, o fuzzer **gera inputs automaticamente** e tenta encontrar combinações que quebram a função. o detalhe que eu não esperava é que não é aleatório "às cegas": o *coverage guidance* faz o fuzzer observar quais caminhos do código cada input percorre, e priorizar variações que abrem caminhos novos (branches, condicionais, casos ainda não exercitados), em vez de ficar testando entradas parecidas repetidamente.

pra usar, você define:

✦ um **seed corpus**: casos base que você já conhece e que servem de ponto de partida
✦ as **propriedades** que sempre devem ser verdade, não importa o input (em vez de comparar contra um resultado esperado fixo, como num teste normal)

o fuzzer então fica mutando os inputs (trocando bytes, aumentando strings, testando limites de int, valores negativos, unicode estranho, etc), guiado pela cobertura de código, tentando violar essas propriedades.

## um exemplo prático

peguei emprestada uma função bem comum de qualquer sistema que processa listas vindas de fora: \`mergeItemsByID\`, que junta itens duplicados de um mesmo \`id\`, somando os valores. os testes manuais que eu tinha escrito passavam sem problema, mas eram só os casos que eu tinha pensado. quis ver o que o fuzzer acharia.

o \`f.Add(...)\` no início é o **seed**: um caso concreto que eu já sei que é interessante, servindo de ponto de partida pro fuzzer. nesse exemplo eu passei dois itens propositalmente com o mesmo \`id\` ("8"), um com valor 495 e outro com 4950. ou seja, já entrego de bandeja um caso de duplicata real, exatamente a situação que a função existe pra tratar. o fuzzer parte desse seed e vai mutando os valores (e o \`id\`) a partir dele:

\`\`\`go
func FuzzMergeItemsByID(f *testing.F) {
    // seed: caso base que você já conhece
    f.Add("8", int64(495), "8", int64(4950))

    f.Fuzz(func(t *testing.T, id1 string, value1 int64, id2 string, value2 int64) {
        input := []*Item{
            {ID: id1, Value: value1},
            {ID: id2, Value: value2},
        }

        result := mergeItemsByID(input)

        // propriedade: se dois itens têm o mesmo id e valores positivos,
        // o valor mesclado nunca pode ser menor que qualquer um dos originais
        if id1 == id2 && value1 > 0 && value2 > 0 && len(result) == 1 {
            merged := result[0].Value
            if merged < value1 || merged < value2 {
                t.Errorf("merge de %d + %d deu %d, resultado menor que uma das parcelas", value1, value2, merged)
            }
        }
    })
}
\`\`\`

repare que eu não comparo \`result\` com um valor fixo esperado: eu verifico uma **propriedade**, somando dois valores positivos, o resultado nunca pode ser menor que qualquer um dos dois. parece óbvio até demais pra escrever um teste sobre isso. só que é exatamente esse tipo de "óbvio demais" que a gente nunca testa manualmente, e foi o que o fuzzer achou.

## rodando o fuzzer

\`\`\`bash
# input
go test -fuzz=FuzzMergeItemsByID -fuzztime=30s

# output
fuzz: elapsed: 0s, gathering baseline coverage: 0/3 completed
fuzz: elapsed: 3s, gathering baseline coverage: 3/3 completed, now fuzzing with 8 workers
fuzz: elapsed: 4s, execs: 89213 (29737/sec), new interesting: 3 (total: 6)
--- FAIL: FuzzMergeItemsByID (0.01s)
    --- FAIL: FuzzMergeItemsByID/3a1f9c2b1e4d7a09
        fuzzing_test.go:19: merge de 9223372036854775807 + 12 deu -9223372036854775797, resultado menor que uma das parcelas
FAIL
exit status 1
FAIL    internal/service    4.312s
\`\`\`

achou um **overflow de \`int64\`**: \`9223372036854775807\` é o valor máximo que um \`int64\` suporta (\`math.MaxInt64\`). somando só 12 a mais, o valor "estoura" e vira negativo. nenhum teste manual ia pensar em passar exatamente esse número como input, mas o fuzzer, mutando bytes, chegou nele rapidinho.

o Go salva esse input automaticamente em \`testdata/fuzz/FuzzMergeItemsByID/\`, como um novo seed. da próxima vez que você rodar \`go test\` normal (sem \`-fuzz\`), esse caso específico já entra na bateria de regressão, sem precisar rodar o fuzzer de novo. a correção, nesse caso, seria detectar o overflow antes de somar (ou usar um tipo maior/\`big.Int\` se os valores puderem realmente chegar perto desse limite).

## quando vale a pena

o exemplo acima é uma função simples, dois campos, uma soma, e ainda assim escondia um bug de overflow que nenhum dos meus testes manuais cobria. imagina então numa função que:

✦ faz **parsing ou deserialização** (JSON, protobuf, formatos próprios)
✦ processa **input de rede ou de usuário** direto, sem passar por validação prévia
✦ tem **espaço de entrada gigante**, onde escrever manualmente "todos os casos de borda" é humanamente inviável

nesses casos o fuzzer costuma achar coisas tipo: string vazia quebra o parser, um int negativo onde eu assumia só positivo, um unicode que quebra o length de uma string em bytes vs. runas. tudo isso que a gente esquece de testar manualmente porque nem passa pela cabeça, até o fuzzer mostrar o número exato que quebra tudo.

## fechando

não é ferramenta pra usar em tudo, mas pra função que mexe com dado que vem de fora do seu controle, é surpreendentemente fácil de configurar e pode achar bug que nenhum teste manual acharia. vale a pena ter como opção.
`,
  content_en: `
I found out about **fuzzing** (\`go test -fuzz\`) this week, introduced in Go 1.18. official docs: [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz/) and the [official tutorial](https://go.dev/doc/tutorial/fuzz).

## what is fuzzing

the [official docs](https://go.dev/doc/security/fuzz/) put it well:

> Fuzzing is a type of automated testing which continuously manipulates inputs to a program to find bugs. Go fuzzing uses coverage guidance to intelligently walk through the code being fuzzed to find and report failures to the user. Since it can reach edge cases which humans often miss, fuzz testing can be particularly valuable for finding security exploits and vulnerabilities.

in other words: instead of writing test cases by hand, the fuzzer **automatically generates inputs** and tries to find combinations that break the function. the part I didn't expect is that it's not "blindly" random: coverage guidance makes the fuzzer track which code paths each input exercises, and prioritize variations that open up new paths (branches, conditionals, cases not yet exercised), instead of repeatedly testing similar inputs.

to use it, you define:

✦ a **seed corpus**: base cases you already know, used as a starting point
✦ the **properties** that must always hold true, no matter the input (instead of comparing against a fixed expected result, like a regular test)

the fuzzer then keeps mutating the inputs (flipping bytes, growing strings, testing int boundaries, negative values, weird unicode, etc), guided by code coverage, trying to violate those properties.

## a practical example

I borrowed a pretty common function found in any system that processes lists coming from outside: \`mergeItemsByID\`, which merges duplicate items with the same \`id\`, summing up the values. the manual tests I had written all passed, but they only covered the cases I had thought of. I wanted to see what the fuzzer would find.

the \`f.Add(...)\` at the top is the **seed**: a concrete case I already know is interesting, used as the fuzzer's starting point. in this example I deliberately passed two items with the same \`id\` ("8"), one with value 495 and the other with 4950. I'm handing it a real duplicate case on a silver platter, exactly the situation the function exists to handle. the fuzzer starts from that seed and mutates the values (and the \`id\`) from there:

\`\`\`go
func FuzzMergeItemsByID(f *testing.F) {
    // seed: a base case you already know
    f.Add("8", int64(495), "8", int64(4950))

    f.Fuzz(func(t *testing.T, id1 string, value1 int64, id2 string, value2 int64) {
        input := []*Item{
            {ID: id1, Value: value1},
            {ID: id2, Value: value2},
        }

        result := mergeItemsByID(input)

        // property: if two items share an id and have positive values,
        // the merged value can never be smaller than either original
        if id1 == id2 && value1 > 0 && value2 > 0 && len(result) == 1 {
            merged := result[0].Value
            if merged < value1 || merged < value2 {
                t.Errorf("merging %d + %d gave %d, result smaller than one of the parts", value1, value2, merged)
            }
        }
    })
}
\`\`\`

notice I don't compare \`result\` against a fixed expected value: I check a **property**, adding two positive values, the result can never be smaller than either one. it sounds almost too obvious to write a test for. and that's exactly the kind of "too obvious" thing we never test manually, and it's what the fuzzer found.

## running the fuzzer

\`\`\`bash
# input
go test -fuzz=FuzzMergeItemsByID -fuzztime=30s

# output
fuzz: elapsed: 0s, gathering baseline coverage: 0/3 completed
fuzz: elapsed: 3s, gathering baseline coverage: 3/3 completed, now fuzzing with 8 workers
fuzz: elapsed: 4s, execs: 89213 (29737/sec), new interesting: 3 (total: 6)
--- FAIL: FuzzMergeItemsByID (0.01s)
    --- FAIL: FuzzMergeItemsByID/3a1f9c2b1e4d7a09
        fuzzing_test.go:19: merging 9223372036854775807 + 12 gave -9223372036854775797, result smaller than one of the parts
FAIL
exit status 1
FAIL    internal/service    4.312s
\`\`\`

it found an **\`int64\` overflow**: \`9223372036854775807\` is the maximum value an \`int64\` can hold (\`math.MaxInt64\`). adding just 12 more makes it wrap around into a negative number. no manual test would think to pass exactly that number as input, but the fuzzer, mutating bytes, got there fast.

Go automatically saves this input in \`testdata/fuzz/FuzzMergeItemsByID/\`, as a new seed. next time you run a regular \`go test\` (without \`-fuzz\`), that specific case is already part of the regression suite, no need to run the fuzzer again. the fix here would be detecting the overflow before adding (or using a bigger type / \`big.Int\` if the values could realistically get close to that limit).

## when it's worth it

the example above is a simple function, two fields, one sum, and it was still hiding an overflow bug none of my manual tests covered. now imagine a function that:

✦ does **parsing or deserialization** (JSON, protobuf, custom formats)
✦ processes **network or user input** directly, without prior validation
✦ has a **huge input space**, where manually writing "every edge case" is humanly unfeasible

in those cases the fuzzer tends to find things like: an empty string breaks the parser, a negative int where I assumed only positive, a unicode character that breaks a byte-vs-rune length assumption. all things we forget to test manually because they don't even cross our minds, until the fuzzer shows you the exact number that breaks everything.

## wrapping up

it's not a tool to use everywhere, but for a function that handles data coming from outside your control, it's surprisingly easy to set up and can find bugs no manual test would catch. worth keeping in your back pocket.
`,
  date: '2026-07-26',
  readTime: 6,
  tags: ['golang', 'testes', 'fuzzing'],
  gopher: '/images/BLUE_GOPHER.png',
}
