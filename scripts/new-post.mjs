#!/usr/bin/env node
// Scaffolds a new post: creates src/data/posts/<slug>.ts and wires it into index.ts.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const postsDir = path.join(__dirname, '..', 'src', 'data', 'posts')
const indexPath = path.join(postsDir, 'index.ts')

const [, , slugArg, ...titleParts] = process.argv

if (!slugArg) {
  console.error('uso: npm run new-post -- <slug> "titulo do post"')
  process.exit(1)
}

const slug = slugArg
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const title = titleParts.join(' ') || slug

const postFile = path.join(postsDir, `${slug}.ts`)

if (existsSync(postFile)) {
  console.error(`já existe: ${postFile}`)
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)

const template = `import type { Post } from './types'

export const post: Post = {
  slug: '${slug}',
  title: '${title}',
  title_en: '',
  excerpt: '',
  excerpt_en: '',
  content: \`

\`,
  content_en: \`

\`,
  date: '${today}',
  readTime: 5,
  tags: [],
  gopher: '/images/GOPHER_LAPTOP.png',
}
`

writeFileSync(postFile, template)
console.log(`criado: ${postFile}`)

// wire into index.ts
const camelCase = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

let indexSrc = readFileSync(indexPath, 'utf8')

const eol = indexSrc.includes('\r\n') ? '\r\n' : '\n'

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
  (_, open, body, close) => `${open}${body.replace(/,\s*$/, '')},${eol}  ${camelCase}${close}`,
)

writeFileSync(indexPath, indexSrc)
console.log(`atualizado: ${indexPath}`)
console.log('\nagora só preencher o conteúdo em', postFile)
