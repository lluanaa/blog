#!/usr/bin/env node
// Converte um arquivo .md (com frontmatter) num post .ts e registra em index.ts.
//
// Formato esperado do .md:
//
// ---
// slug: field-mask
// title: titulo em portugues
// title_en: title in english
// excerpt: resumo em portugues
// excerpt_en: summary in english
// date: 2025-04-20
// readTime: 8
// tags: protobuf, golang, microservices
// gopher: /images/GOPHER_LAPTOP.png
// ---
//
// conteudo em portugues (markdown normal, pode usar ```code``` etc)
//
// <!-- en -->
//
// content in english (opcional; se nao tiver, content_en fica vazio)

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const postsDir = path.join(__dirname, '..', 'src', 'data', 'posts')
const indexPath = path.join(postsDir, 'index.ts')

const [, , mdPathArg] = process.argv

if (!mdPathArg) {
  console.error('uso: npm run md-to-post -- caminho/para/post.md')
  process.exit(1)
}

const mdPath = path.resolve(mdPathArg)
if (!existsSync(mdPath)) {
  console.error(`arquivo não encontrado: ${mdPath}`)
  process.exit(1)
}

const raw = readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n')

const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
if (!fmMatch) {
  console.error('não encontrei frontmatter (bloco --- ... --- no topo do arquivo)')
  process.exit(1)
}

const [, fmBlock, body] = fmMatch

// parser simples de "chave: valor" (uma linha por chave, sem YAML aninhado)
const meta = {}
for (const line of fmBlock.split('\n')) {
  if (!line.trim()) continue
  const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/)
  if (!m) continue
  const [, key, value] = m
  meta[key.trim()] = value.trim()
}

const required = ['slug', 'title', 'date']
for (const key of required) {
  if (!meta[key]) {
    console.error(`frontmatter sem campo obrigatório: ${key}`)
    process.exit(1)
  }
}

const [ptContent, enContent = ''] = body.split(/<!--\s*en\s*-->/i).map((s) => s.trim())

const tags = meta.tags
  ? meta.tags.split(',').map((t) => t.trim()).filter(Boolean)
  : []

const slug = meta.slug
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
const postFile = path.join(postsDir, `${slug}.ts`)
const isUpdate = existsSync(postFile)

// escapa backticks e ${ pra não quebrar o template literal
const escapeTemplate = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

const esc = (s) => (s || '').replace(/'/g, "\\'")

const template = `import type { Post } from './types'

export const post: Post = {
  slug: '${esc(slug)}',
  title: '${esc(meta.title)}',
  title_en: '${esc(meta.title_en || '')}',
  excerpt: '${esc(meta.excerpt || '')}',
  excerpt_en: '${esc(meta.excerpt_en || '')}',
  content: \`
${escapeTemplate(ptContent)}
\`,
  content_en: \`
${escapeTemplate(enContent)}
\`,
  date: '${esc(meta.date)}',
  readTime: ${Number(meta.readTime) || 5},
  tags: [${tags.map((t) => `'${esc(t)}'`).join(', ')}],${meta.featured === 'true' ? '\n  featured: true,' : ''}
  gopher: '${esc(meta.gopher || '/images/GOPHER_LAPTOP.png')}',
}
`

writeFileSync(postFile, template)
console.log(isUpdate ? `atualizado: ${postFile}` : `criado: ${postFile}`)

// wire into index.ts (idempotente: só registra se ainda não estiver lá)
const camelCase = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

let indexSrc = readFileSync(indexPath, 'utf8')
const eol = indexSrc.includes('\r\n') ? '\r\n' : '\n'
const alreadyRegistered = indexSrc.includes(`from './${slug}'`)

if (alreadyRegistered) {
  console.log(`já registrado em ${indexPath}, nada a fazer`)
} else {
  const importLine = `import { post as ${camelCase} } from './${slug}'${eol}`
  const lastImportMatch = [...indexSrc.matchAll(/^import .*\r?\n/gm)].pop()
  if (lastImportMatch) {
    const insertAt = lastImportMatch.index + lastImportMatch[0].length
    indexSrc = indexSrc.slice(0, insertAt) + importLine + indexSrc.slice(insertAt)
  } else {
    indexSrc = importLine + indexSrc
  }

  indexSrc = indexSrc.replace(
    /(export const posts: Post\[\] = \[\r?\n)([\s\S]*?)(\r?\n\])/,
    (_, open, bodyArr, close) => `${open}${bodyArr.replace(/,\s*$/, '')},${eol}  ${camelCase}${close}`,
  )

  writeFileSync(indexPath, indexSrc)
  console.log(`atualizado: ${indexPath}`)
}

console.log('\npronto! bora conferir no npm run dev')
