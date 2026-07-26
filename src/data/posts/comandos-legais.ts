import type { Post } from './types'

export const post: Post = {
  slug: 'comandos-legais',
  title: 'comandos úteis pra se localizar em microsserviços',
  title_en: 'useful commands to find your way around microservices',
  excerpt: 'uma coletânea de comandos de terminal (busca, texto, JSON, logs) que salvam meu dia a dia quando preciso achar algo no meio de vários repositórios.',
  excerpt_en: 'a collection of terminal commands (search, text, JSON, logs) that save my day-to-day when I need to find something across multiple repositories.',
  content: `
olá, caros leitores (total de 0 pessoas), hoje irei lhes mostrar uns comandos maneiros para usar quando você, assim como eu, trabalha com microsserviços, não tem um worktree com +30 repositórios juntos e abre um repo de cada vez, rs, e precisa achar algo no meio de tudo isso.

obviamente eu tenho os meus favoritos, mas separei aqui só os que realmente uso toda semana.

## buscando em arquivos e código

### \`grep\`, o clássico

o \`grep\` é um utilitário do Linux/Unix usado para buscar e filtrar padrões em textos ou arquivos. ele localiza linhas que correspondem a uma palavra-chave ou expressão regular, e é indispensável pra analisar logs e processar dados.

**sintaxe:**

\`\`\`bash
grep [opções] 'padrão' [arquivo]
\`\`\`

✦ \`grep\`: o nome do utilitário
✦ \`opções\`: argumentos que modificam o comportamento
✦ \`padrão\`: a palavra-chave que você quer buscar
✦ \`arquivo\`: o arquivo (ou arquivos) onde buscar

**flags que eu mais uso:**

✦ \`-r\`: recursivo, busca em todas as subpastas
✦ \`-n\`: mostra o número da linha
✦ \`-l\`: só lista os arquivos que batem (sem mostrar o conteúdo)
✦ \`--include=*.go\`: filtra só arquivos de uma extensão
✦ \`| grep -v _test\`: encadeado, exclui os arquivos de teste do resultado

**exemplo de uso** (buscando uma função chamada \`CalculateBonus\` num diretório de projetos inteiro, recursivamente, só em arquivos Go, sem os testes):

\`\`\`bash
# input
grep -rn "CalculateBonus" ~/projetos --include=*.go | grep -v _test

# output
./internal/service/bonus.go:42:func CalculateBonus(score float64) float64 {
\`\`\`

pra aprender mais sobre todas as opções, dá uma olhada no [manual do grep](https://man7.org/linux/man-pages/man1/grep.1.html) ou rode \`grep --help\` direto no terminal.

### \`ripgrep\` (\`rg\`), o grep turbinado

o \`grep\` já resolve buscas simples, mas quando o projeto cresce (tipo várias pastas, vários repositórios), o \`ripgrep\` é muito mais rápido e já vem com resultados mais legíveis: arquivo, linha e contexto colorido.

\`\`\`bash
# input
rg "CalculateBonus" ~/projetos --type go

# output
internal/service/bonus.go
42:func CalculateBonus(score float64) float64 {

internal/service/bonus_test.go
15:    result := CalculateBonus(0.8)
\`\`\`

no VS Code, o atalho **Ctrl+Shift+F** (busca global) usa o \`ripgrep\` por baixo dos panos, então se você já usa esse atalho, já tá usando \`rg\` sem saber hehe

### \`fzf\`, busca interativa

quando você sabe que o termo existe em algum lugar, mas não lembra exatamente onde, o \`fzf\` combinado com \`rg\` é perfeito: ele filtra os resultados em tempo real conforme você digita.

\`\`\`bash
# input
rg "CalculateBonus" ~/projetos --type go | fzf
\`\`\`

você digita, os resultados vão sendo filtrados na hora, e ao selecionar um, abre o arquivo no editor. muito mais rápido do que rodar o mesmo grep repositório por repositório.

**instalação no Fedora:**

\`\`\`bash
sudo dnf install ripgrep fzf
\`\`\`

(se você tá no Ubuntu/Debian, é \`apt install ripgrep fzf\`)

## trabalhando com texto e JSON

### \`jq\`, o "grep do JSON"

se você trabalha com APIs, o \`jq\` é essencial pra filtrar e formatar payloads JSON direto na linha de comando, sem precisar abrir um script.

\`\`\`bash
# input (supondo um response.json de exemplo)
cat response.json | jq '.user.address.city'

# output
"Curitiba"
\`\`\`

documentação oficial: [jqlang.org](https://jqlang.org/)

\`jq\` é ótimo pra uma consulta rápida numa linha só. mas quando a lógica fica mais complexa (cruzar campos, condicionais, calcular algo em cima dos dados), eu troco pra Python direto no terminal, sem precisar criar um arquivo \`.py\`:

\`\`\`bash
# input
python3 -c "
import json
with open('arquivo.json') as f:
    data = json.load(f)
# lógica aqui
"
\`\`\`

pra busca simples em arquivo de código, \`grep\` continua mais rápido e direto. mas pra **analisar dado/JSON** com alguma lógica a mais, Python é bem mais poderoso que empilhar filtros de \`jq\`.

### \`awk\` e \`sed\`, manipulação de texto

dois clássicos do Unix pra processar texto linha a linha.

\`awk\` é ótimo pra extrair colunas:

\`\`\`bash
# input (arquivo de log com colunas separadas por espaço)
awk '{print $1, $4}' access.log

# output
192.168.0.1 [23/Jul/2026:10:15:00]
\`\`\`

\`sed\` é ótimo pra substituir texto:

\`\`\`bash
# input
echo "ambiente: staging" | sed 's/staging/production/'

# output
ambiente: production
\`\`\`

## investigando logs

quando os logs estão comprimidos (\`.gz\`), dá pra buscar sem precisar descompactar:

\`\`\`bash
# input
zgrep "ERROR" app.log.gz

# output
2026-07-23T14:32:10 ERROR falha ao conectar no banco
\`\`\`

e pra acompanhar logs em tempo real:

\`\`\`bash
tail -f app.log
\`\`\`

### \`kcat\`, debugando eventos Kafka

quando um evento some ou chega errado entre microsserviços (tipo um \`ORDER_CREATED\` que não disparou), dá pra inspecionar a fila direto, sem precisar subir nenhuma ferramenta gráfica:

\`\`\`bash
# input: consumir as últimas 5 mensagens de um tópico
kcat -b localhost:9092 -t ORDER_CREATED -C -o -5 -e

# output
{"id": 1, "evento": "criado"}
{"id": 2, "evento": "atualizado"}
...
\`\`\`

resolveu na hora um mistério que ia levar muito mais tempo lendo log de aplicação.

## e é isso

nenhum desses comandos é chique nem novo, mas juntos economizam muito tempo quando você trabalha com vários serviços espalhados. pra ir além, \`man grep\`/\`grep --help\` e o [explainshell.com](https://explainshell.com/) (cola qualquer comando cheio de flags e ele explica parte por parte) resolvem praticamente qualquer dúvida.

se tiver algum favorito seu que eu não citei aqui, me fala nos comentários aí, rapaziadinha dos computers, já se inscreve no canal e ativa o sininho.
`,
  content_en: `
hello, dear readers (0 of you total), today I'll show you some handy commands to use when you, like me, work with microservices, don't have a worktree with +30 repos joined together and open one repo at a time instead, and need to find something in the middle of all that.

obviously I have my favorites, but here are just the ones I actually use every week, no generic manual-page list.

## searching in files and code

### \`grep\`, the classic

\`grep\` is a Linux/Unix utility used to search and filter patterns in text or files. it finds lines matching a keyword or regular expression, and it's indispensable for parsing logs and processing data.

**syntax:**

\`\`\`bash
grep [options] 'pattern' [file]
\`\`\`

✦ \`grep\`: the utility name
✦ \`options\`: arguments that change the command's behavior
✦ \`pattern\`: the keyword you want to search for
✦ \`file\`: the file (or files) to search in

**flags I use the most:**

✦ \`-r\`: recursive, searches every subfolder
✦ \`-n\`: shows the line number
✦ \`-l\`: only lists matching files (no content shown)
✦ \`--include=*.go\`: filters by file extension
✦ \`| grep -v _test\`: chained, excludes test files from the result

**example** (searching for a function called \`CalculateBonus\` across an entire projects directory, recursively, Go files only, excluding tests):

\`\`\`bash
# input
grep -rn "CalculateBonus" ~/projects --include=*.go | grep -v _test

# output
./internal/service/bonus.go:42:func CalculateBonus(score float64) float64 {
\`\`\`

to learn more about all the options, check the [grep manual](https://man7.org/linux/man-pages/man1/grep.1.html) or run \`grep --help\` directly in the terminal.

### \`ripgrep\` (\`rg\`), grep on steroids

\`grep\` already handles simple searches, but once a project grows (several folders, several repositories), \`ripgrep\` is much faster and comes with more readable output: file, line, and colored context.

\`\`\`bash
# input
rg "CalculateBonus" ~/projects --type go

# output
internal/service/bonus.go
42:func CalculateBonus(score float64) float64 {

internal/service/bonus_test.go
15:    result := CalculateBonus(0.8)
\`\`\`

in VS Code, the **Ctrl+Shift+F** shortcut (global search) uses \`ripgrep\` under the hood, so if you already use that shortcut, you're using \`rg\` without knowing it 😄

### \`fzf\`, interactive search

when you know a term exists somewhere but don't remember exactly where, \`fzf\` combined with \`rg\` is perfect: it filters results in real time as you type.

\`\`\`bash
# input
rg "CalculateBonus" ~/projects --type go | fzf
\`\`\`

you type, results get filtered live, and selecting one opens the file in your editor. much faster than running the same grep repository by repository.

**installing on Fedora:**

\`\`\`bash
sudo dnf install ripgrep fzf
\`\`\`

(on Ubuntu/Debian it's \`apt install ripgrep fzf\`)

## working with text and JSON

### \`jq\`, the "grep for JSON"

if you work with APIs, \`jq\` is essential for filtering and formatting JSON payloads directly from the command line, without opening a script.

\`\`\`bash
# input (assuming a sample response.json)
cat response.json | jq '.user.address.city'

# output
"Curitiba"
\`\`\`

official docs: [jqlang.org](https://jqlang.org/)

\`jq\` is great for a quick one-liner query. but when the logic gets more complex (cross-referencing fields, conditionals, computing something from the data), I switch to Python right in the terminal, no need to create a \`.py\` file:

\`\`\`bash
# input
python3 -c "
import json
with open('file.json') as f:
    data = json.load(f)
# logic here
"
\`\`\`

for simple code search, \`grep\` is still faster and more direct. but for **analyzing data/JSON** with some extra logic, Python is much more powerful than stacking \`jq\` filters.

### \`awk\` and \`sed\`, text manipulation

two Unix classics for processing text line by line.

\`awk\` is great for extracting columns:

\`\`\`bash
# input (log file with space-separated columns)
awk '{print $1, $4}' access.log

# output
192.168.0.1 [23/Jul/2026:10:15:00]
\`\`\`

\`sed\` is great for substituting text:

\`\`\`bash
# input
echo "environment: staging" | sed 's/staging/production/'

# output
environment: production
\`\`\`

## investigating logs

when logs are compressed (\`.gz\`), you can search without decompressing them first:

\`\`\`bash
# input
zgrep "ERROR" app.log.gz

# output
2026-07-23T14:32:10 ERROR failed to connect to database
\`\`\`

and to follow logs in real time:

\`\`\`bash
tail -f app.log
\`\`\`

### \`kcat\`, debugging Kafka events

when an event disappears or arrives wrong between microservices (like an \`ORDER_CREATED\` that never fired), you can inspect the topic directly, without spinning up any GUI tool:

\`\`\`bash
# input: consume the last 5 messages from a topic
kcat -b localhost:9092 -t ORDER_CREATED -C -o -5 -e

# output
{"id": 1, "event": "created"}
{"id": 2, "event": "updated"}
...
\`\`\`

solved a mystery on the spot that would've taken much longer digging through application logs.

## that's it

none of these commands are fancy or new, but together they save a lot of time when you work across several scattered services. to go further, \`man grep\`/\`grep --help\` and [explainshell.com](https://explainshell.com/) (paste any command full of flags and it explains it piece by piece) answer pretty much any question.

if you have a favorite I didn't mention here, let me know in the comments.
`,
  date: '2026-07-24',
  readTime: 5,
  tags: ['comandos', 'produtividade', 'linux'],
  gopher: '/images/BATMAN_GOPHER.png',
}
