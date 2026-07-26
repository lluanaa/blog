import { useEffect } from 'react'

const SITE_URL = 'https://lluana.com'
const DEFAULT_IMAGE = `${SITE_URL}/images/GOPHER_LAPTOP.png`
const DEFAULT_DESCRIPTION = 'blog pessoal sobre bugs, decisões de arquitetura, ferramentas aprendidas e a ocasional crise existencial de dev.'

interface SeoOptions {
  title: string
  description?: string
  image?: string
  path?: string
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function useSeo({ title, description, image, path }: SeoOptions) {
  useEffect(() => {
    const cleanTitle = title.replace(/^\/\/\s*/, '')
    const fullTitle = cleanTitle === 'luana.dev' ? cleanTitle : `${cleanTitle} · luana.dev`
    document.title = fullTitle

    const url = `${SITE_URL}${path ?? ''}`
    const img = image ?? DEFAULT_IMAGE
    const desc = description ?? DEFAULT_DESCRIPTION

    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', img)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:image', img)
    setMeta('name', 'description', desc)
    setMeta('property', 'og:description', desc)
    setMeta('name', 'twitter:description', desc)
  }, [title, description, image, path])
}
