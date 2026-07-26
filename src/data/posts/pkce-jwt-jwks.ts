import type { Post } from './types'

export const post: Post = {
  slug: 'pkce-jwt-jwks',
  title: 'PKCE, JWT e JWKS, o que eu aprendi implementando login com Okta',
  title_en: 'PKCE, JWT, and JWKS, what I learned debugging an Okta login',
  excerpt: 'um mergulho em como PKCE, JWT e JWKS se encaixam numa autenticação real de SPA + backend, depois de debugar um login com Okta que só quebrava em staging.',
  excerpt_en: 'a deep dive into how PKCE, JWT, and JWKS fit together in a real SPA + backend authentication flow, after debugging an Okta login that only broke in staging.',
  content: `
semana passada eu implementei login via Okta numa aplicação React + Go. tudo funcionava local. foi pra staging e... nada. segui investigando e cada camada que eu puxava tinha um termo novo que eu nunca tinha parado pra entender de verdade: JWT, JWKS, PKCE, nonce, issuer, audience.

fui atrás de vídeo no YouTube pra entender rápido e achei um monte de conteúdo sobre JWT sozinho, ou sobre PKCE sozinho (quase sempre focado em app mobile), mas nada juntando os três e mostrando como eles se encaixam numa aplicação web de verdade. então resolvi escrever o que eu queria ter encontrado.

## o cenário

uma SPA (Single Page Application, se você não conhece o termo, é basicamente o modelo do React: o navegador carrega um único HTML e JS no início, e a partir daí é o próprio JavaScript que troca o conteúdo da tela, sem recarregar a página) precisa autenticar o usuário via Okta (um provedor de identidade, tipo um "Google Login" só que corporativo). depois de autenticado, ela chama um backend em Go que precisa confiar nessa autenticação.

isso levanta duas perguntas:

1. como a SPA prova pro Okta que é ela mesma, sem expor um segredo no código público?
2. como o backend confia no que a SPA diz, sem chamar o Okta a cada request?

a resposta da primeira é **PKCE**. a resposta da segunda é **JWT + JWKS**.

## primeiro: o que é um JWT

JWT (JSON Web Token) é um "crachá digital". tem três partes separadas por ponto: \`header.payload.signature\`.

o \`payload\` é um JSON com informações sobre o usuário e sobre o próprio token, os **claims**. alguns claims padronizados que você vai ver sempre:

✦ \`iss\` (issuer): quem emitiu o token
✦ \`aud\` (audience): pra qual aplicação esse token foi feito
✦ \`exp\` (expiration): timestamp de quando expira
✦ \`sub\` (subject): identificador do usuário

importante: o payload **não é criptografado**, só assinado. qualquer um que pegar o token e decodificar o base64 consegue ler esse JSON. o que impede alguém de alterar o conteúdo é a \`signature\`, a terceira parte.

## como a assinatura funciona sem expor segredo nenhum

aqui é onde entra criptografia assimétrica, e é o ponto que mais gente acha contra-intuitivo: **como pode não ser forjável se todo mundo pode acessar a chave pública?**

a resposta é que assinar e verificar são operações diferentes, feitas por chaves diferentes:

✦ a **chave privada** consegue **criar** uma assinatura. só o Okta tem ela
✦ a **chave pública** só consegue **conferir** se uma assinatura é válida. qualquer um pode ter ela

pensa assim: a chave pública é como o molde do buraco de uma fechadura. com o molde, você testa se uma chave específica encaixa, ou seja, você consegue **verificar**. mas ter o molde não te dá como **fabricar** a chave física que gira dentro dele. é assimétrico de propósito: os algoritmos usados (RSA, EC) são baseados em problemas matemáticos fáceis numa direção e absurdamente difíceis de reverter na outra (por exemplo, multiplicar dois primos gigantes é rápido; fatorar o resultado de volta nos primos originais levaria mais tempo que a idade do universo, nos tamanhos de chave usados hoje).

## o que é JWKS, então

JWKS (JSON Web Key Set) não é um tipo de token, é o **chaveiro público**. um endpoint que devolve um JSON com as chaves públicas do provedor:

\`\`\`json
{
  "keys": [
    { "kty": "RSA", "kid": "abc123", "n": "...", "e": "AQAB", "use": "sig" }
  ]
}
\`\`\`

cada provedor de identidade sério publica um (Google, Auth0, Azure AD, Okta, Keycloak, é parte do padrão OIDC, não é exclusividade de nenhum deles). o \`kid\` (Key ID) importa porque as chaves rotacionam com o tempo: cada token diz no header "fui assinado com a chave X", e o backend usa isso pra saber qual entrada do JWKS conferir.

na prática, seu backend faz isto:

1. recebe o token
2. baixa (ou usa em cache) o JWKS do provedor
3. confere a assinatura contra a chave pública correspondente
4. confere \`iss\`, \`aud\`, \`exp\`

tudo isso **sem nenhuma chamada de volta pro Okta a cada request**. é local, rápido, e é o que torna JWT prático pra autenticação de API.

## agora: como a SPA prova sua identidade sem segredo (PKCE)

no fluxo OAuth2 clássico, depois do login o provedor manda um \`code\` de volta via redirect de URL, que depois é trocado por um token. historicamente, essa troca exigia um \`client_secret\`, uma senha fixa da aplicação.

o problema: numa SPA, todo o código roda **dentro do navegador**, visível pra qualquer um que abrir o DevTools ou baixar o JS. não tem como esconder um segredo fixo ali, é fisicamente impossível, porque o JS precisa estar legível pro motor do navegador rodar.

PKCE (Proof Key for Code Exchange) resolve isso trocando "segredo fixo" por "segredo de uso único, gerado na hora":

1. **antes** de redirecionar pro provedor, o app gera um valor aleatório (\`code_verifier\`) e guarda localmente (sessionStorage)
2. calcula um hash dele (\`code_challenge = SHA256(code_verifier)\`) e manda só o **hash** na URL de autorização
3. usuário loga no provedor
4. provedor redireciona de volta com um \`code\`
5. na hora de trocar o \`code\` por token, o app manda o \`code_verifier\` original (não mais o hash)
6. o provedor refaz o hash e confere se bate com o que guardou no passo 2

se alguém interceptar só o \`code\` (mais fácil de vazar, já que passa por redirect de URL), não adianta nada sem o \`code_verifier\` original, que nunca saiu daquele navegador específico.

## juntando tudo no fluxo real

[iframe](/images/pkce_jwt_flow_blog_theme.svg)

o passo 1-2 é resolvido com **PKCE** (a SPA prova quem é, sem segredo fixo). o passo 3 é resolvido com **JWT + JWKS** (o backend confia no token sem chamar o provedor a cada request).

## um detalhe que quase me confundiu: o nonce

além de \`iss\`/\`aud\`/\`exp\`, o OIDC também tem o conceito de **nonce**: um valor aleatório que o app gera antes do login pra evitar replay attack (reuso de um token antigo como se fosse um login novo).

a diferença importante: os outros 4 campos protegem o **token em si**. o nonce protege o **processo de login**. e quem gera o nonce é o app que iniciou o fluxo (a SPA), não o backend que só recebe o token depois. se você usar uma lib de validação que **exige** conferir nonce no backend, ela está assumindo que o backend é quem gerou esse nonce originalmente, o que não é o caso quando o fluxo é "SPA faz PKCE sozinha, backend só valida assinatura depois". foi exatamente esse detalhe que me fez trocar de biblioteca de validação no meio da implementação. vale um post à parte só sobre isso.

## resumindo

✦ **JWT** é o crachá: um payload legível + uma assinatura que garante que ninguém alterou o conteúdo
✦ **JWKS** é o chaveiro público: o que o backend usa pra conferir a assinatura sem precisar ligar pro provedor a cada request
✦ **PKCE** é o "aperto de mão secreto" que permite uma aplicação pública (SPA) provar sua identidade num fluxo de login, sem precisar guardar segredo nenhum no código

três peças, três problemas diferentes. juntas, é o que faz um login com provedor externo funcionar de forma segura numa aplicação moderna.
`,
  content_en: `
last week I implemented login via Okta in a React + Go application. everything worked locally. it went to staging and... nothing. I kept investigating and every layer I pulled had a new term I'd never actually stopped to understand: JWT, JWKS, PKCE, nonce, issuer, audience.

I went looking for videos on YouTube to understand it quickly and found a ton of content about JWT alone, or PKCE alone (almost always focused on mobile apps), but nothing putting the three together and showing how they fit into a real web application. so I decided to write what I wished I had found.

## the scenario

an SPA (Single Page Application, if you're not familiar with the term, it's basically React's model: the browser loads a single HTML and JS bundle at the start, and from then on JavaScript itself swaps out what's on screen, without reloading the page) needs to authenticate the user via Okta (an identity provider, kind of like a "Google Login" but for enterprises). once authenticated, it calls a Go backend that needs to trust that authentication.

that raises two questions:

1. how does the SPA prove to Okta that it's itself, without exposing a secret in public code?
2. how does the backend trust what the SPA says, without calling Okta on every request?

the answer to the first is **PKCE**. the answer to the second is **JWT + JWKS**.

## first: what is a JWT

a JWT (JSON Web Token) is a "digital badge". it has three parts separated by dots: \`header.payload.signature\`.

the \`payload\` is a JSON with information about the user and about the token itself, the **claims**. some standardized claims you'll always see:

✦ \`iss\` (issuer): who issued the token
✦ \`aud\` (audience): which application this token was made for
✦ \`exp\` (expiration): timestamp of when it expires
✦ \`sub\` (subject): user identifier

important: the payload is **not encrypted**, only signed. anyone who gets the token and decodes the base64 can read that JSON. what prevents someone from tampering with the content is the \`signature\`, the third part.

## how the signature works without exposing any secret

this is where asymmetric cryptography comes in, and it's the point most people find counter-intuitive: **how can it be unforgeable if everyone can access the public key?**

the answer is that signing and verifying are different operations, done with different keys:

✦ the **private key** can **create** a signature. only Okta has it
✦ the **public key** can only **verify** whether a signature is valid. anyone can have it

think of it like this: the public key is like the mold of a keyhole. with the mold, you can test whether a specific key fits, that is, you can **verify**. but having the mold doesn't let you **manufacture** the physical key that turns inside it. it's asymmetric on purpose: the algorithms used (RSA, EC) are based on math problems that are easy in one direction and absurdly hard to reverse in the other (for example, multiplying two giant primes is fast; factoring the result back into the original primes would take longer than the age of the universe, at the key sizes used today).

## what JWKS is, then

JWKS (JSON Web Key Set) isn't a type of token, it's the **public keyring**. an endpoint that returns a JSON with the provider's public keys:

\`\`\`json
{
  "keys": [
    { "kty": "RSA", "kid": "abc123", "n": "...", "e": "AQAB", "use": "sig" }
  ]
}
\`\`\`

every serious identity provider publishes one (Google, Auth0, Azure AD, Okta, Keycloak, it's part of the OIDC standard, not exclusive to any of them). the \`kid\` (Key ID) matters because keys rotate over time: each token's header says "I was signed with key X", and the backend uses that to know which entry in the JWKS to check.

in practice, your backend does this:

1. receives the token
2. downloads (or caches) the provider's JWKS
3. checks the signature against the matching public key
4. checks \`iss\`, \`aud\`, \`exp\`

all of this **without a single call back to Okta on every request**. it's local, fast, and it's what makes JWT practical for API authentication.

## now: how the SPA proves its identity without a secret (PKCE)

in the classic OAuth2 flow, after login the provider sends back a \`code\` via URL redirect, which is later exchanged for a token. historically, that exchange required a \`client_secret\`, a fixed application password.

the problem: in an SPA, all the code runs **inside the browser**, visible to anyone who opens DevTools or downloads the JS. there's no way to hide a fixed secret there, it's physically impossible, because the JS needs to be readable for the browser engine to run it.

PKCE (Proof Key for Code Exchange) solves this by trading a "fixed secret" for a "single-use secret, generated on the spot":

1. **before** redirecting to the provider, the app generates a random value (\`code_verifier\`) and stores it locally (sessionStorage)
2. it computes a hash of it (\`code_challenge = SHA256(code_verifier)\`) and sends only the **hash** in the authorization URL
3. the user logs into the provider
4. the provider redirects back with a \`code\`
5. when exchanging the \`code\` for a token, the app sends the original \`code_verifier\` (no longer the hash)
6. the provider recomputes the hash and checks it matches what it stored in step 2

if someone intercepts only the \`code\` (easier to leak, since it goes through a URL redirect), it's useless without the original \`code_verifier\`, which never left that specific browser.

## putting it all together in the real flow

[iframe](/images/pkce_jwt_flow_blog_theme_en.svg)

steps 1-2 are solved with **PKCE** (the SPA proves who it is, without a fixed secret). step 3 is solved with **JWT + JWKS** (the backend trusts the token without calling the provider on every request).

## one detail that almost confused me: the nonce

besides \`iss\`/\`aud\`/\`exp\`, OIDC also has the concept of a **nonce**: a random value the app generates before login to prevent replay attacks (reusing an old token as if it were a new login).

the important difference: the other 4 fields protect the **token itself**. the nonce protects the **login process**. and the one who generates the nonce is the app that started the flow (the SPA), not the backend that only receives the token afterward. if you use a validation library that **requires** checking the nonce on the backend, it's assuming the backend is the one who originally generated that nonce, which isn't the case when the flow is "SPA does PKCE on its own, backend just validates the signature afterward". that exact detail is what made me switch validation libraries midway through the implementation. worth a post of its own.

## wrapping up

✦ **JWT** is the badge: a readable payload + a signature that guarantees nobody tampered with the content
✦ **JWKS** is the public keyring: what the backend uses to check the signature without needing to call the provider on every request
✦ **PKCE** is the "secret handshake" that lets a public application (SPA) prove its identity in a login flow, without needing to store any secret in the code

three pieces, three different problems. together, they're what makes login with an external provider work securely in a modern application.
`,
  date: '2026-07-26',
  readTime: 9,
  tags: ['autenticação', 'oauth2', 'jwt'],
  featured: true,
  gopher: '/images/DRAWING_GOPHER.png',
}
