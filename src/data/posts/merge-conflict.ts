import type { Post } from './types'

export const post: Post = {
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
}
