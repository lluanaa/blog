import type { Post } from './types'

export const post: Post = {
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

✦ \`../meu-servico:/app\` monta o repo real do seu computador dentro do container no caminho \`/app\`. É o que permite o *hot reload*: o *Air* roda dentro do container lendo de \`/app\`, que é literalmente a mesma pasta que você edita no VS Code.

✦ \`.air.toml:/app/.air.toml:ro\` injeta o arquivo de configuração do *Air* dentro do container. O \`:ro\` é *read-only*: o container pode ler mas não pode modificar.

✦ \`go-mod-cache:/go/pkg/mod\` é o cache dos módulos Go. Sem isso, toda vez que o container reiniciasse ele baixaria todas as dependências do zero. Com isso, o download acontece uma vez e fica salvo entre restarts.

✦ \`go-build-cache:/root/.cache/go-build\` é o cache de compilação. Faz o build ser mais rápido nas próximas vezes porque o Go aproveita o que já compilou antes.

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

✦ \`../meu-servico:/app\` mounts the real repo from your computer inside the container at the \`/app\` path. This is what enables *hot reload*: *Air* runs inside the container reading from \`/app\`, which is literally the same folder you're editing in VS Code.

✦ \`.air.toml:/app/.air.toml:ro\` injects the *Air* config file inside the container. The \`:ro\` is *read-only*: the container can read it but can't modify it.

✦ \`go-mod-cache:/go/pkg/mod\` is the Go module cache. Without this, every time the container restarted it would download all dependencies from scratch. With it, the download happens once and persists between restarts.

✦ \`go-build-cache:/root/.cache/go-build\` is the build cache. Makes subsequent builds faster because Go reuses what it already compiled before.

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
  gopher: '/images/DOCKER_GOPHER.png',
}
