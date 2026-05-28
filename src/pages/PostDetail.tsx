import { useState } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPostBySlug } from '../data/posts'
import Comments from '../components/Comments'
import hljs from 'highlight.js/lib/core'
import go from 'highlight.js/lib/languages/go'
import bash from 'highlight.js/lib/languages/bash'
import typescript from 'highlight.js/lib/languages/typescript'
import 'highlight.js/styles/tokyo-night-dark.css'
import './PostDetail.css'

hljs.registerLanguage('go', go)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('typescript', typescript)

function formatDate(iso: string, locale = 'pt-BR') {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      className={`post-content__copy${copied ? ' post-content__copy--copied' : ''}`}
      onClick={copy}
      aria-label="copy code"
      data-tooltip={copied ? 'Copiado!' : 'Copiar'}
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}

/** Very small markdown-like renderer (no external deps) */
function renderContent(raw: string) {
  const lines = raw.trim().split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="post-content__h2">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="post-content__h1">{line.slice(2)}</h1>)
    } else if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      const code = codeLines.join('\n')
      const highlighted = lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value
      elements.push(
        <div key={i} className="post-content__code-wrap">
          <div className="post-content__code-header">
            {lang && <span className="post-content__code-lang">{lang}</span>}
            <CopyButton code={code} />
          </div>
          <pre className="post-content__pre"><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
        </div>
      )
    } else if (line.trim() === '') {
      // skip blank lines
    } else if (/^\[iframe\]\(.*?\)$/.test(line.trim())) {
      const match = line.trim().match(/^\[iframe\]\((.*?)\)$/)
      if (match) {
        const src = match[1]
        elements.push(
          src.endsWith('.svg')
            ? <img key={i} src={src} className="post-content__svg" alt="" />
            : <iframe key={i} src={src} className="post-content__iframe" title="embed" allowTransparency={true} style={{ border: 'none', background: 'transparent' }} />
        )
      }
    } else if (/^!\[.*?\]\(.*?\)$/.test(line.trim())) {
      const match = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/)
      if (match) {
        elements.push(
          <figure key={i} className="post-content__figure">
            <img src={match[2]} alt={match[1]} className="post-content__img" />
            {match[1] && <figcaption className="post-content__caption">{match[1]}</figcaption>}
          </figure>
        )
      }
    } else {
      // inline bold/italic/code
      const html = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="post-content__inline-code">$1</code>')
        .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="post-content__link">$1</a>')
      elements.push(
        <p key={i} className="post-content__p" dangerouslySetInnerHTML={{ __html: html }} />
      )
    }
    i++
  }
  return elements
}

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const post = getPostBySlug(slug ?? '')

  if (!post) return <Navigate to="/posts" replace />

  const title = isEn && post.title_en ? post.title_en : post.title
  const excerpt = isEn && post.excerpt_en ? post.excerpt_en : post.excerpt
  const content = isEn && post.content_en ? post.content_en : post.content
  const locale = isEn ? 'en-US' : 'pt-BR'

  return (
    <div className="post-detail">
      <div className="post-detail__back fade-up">
        <button onClick={() => navigate(-1)} className="btn-ghost">{t('post.back')}</button>
      </div>

      <header className="post-detail__header fade-up-2">
        <div className="post-detail__eyebrow">
          <div className="post-detail__tags">
            {post.tags.map((tag) => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
          </div>
          <span className="post-detail__date">{formatDate(post.date, locale)}</span>
        </div>
        <h1 className="title-display post-detail__title">{title}</h1>
        <p className="post-detail__excerpt">{excerpt}</p>
        <div className="post-detail__meta">
          <span>{t('post.readTime', { min: post.readTime })}</span>
        </div>
      </header>


<article className="post-detail__content card fade-up-3">
        {renderContent(content)}
      </article>

      <div className="post-detail__comments fade-up-4">
        <Comments />
      </div>

      <div className="post-detail__footer fade-up-4">
        <Link to="/posts" className="btn-ghost">{t('post.allPosts')}</Link>
        <Link to="/guestbook" className="btn-primary">{t('post.guestbook')}</Link>
      </div>
    </div>
  )
}
