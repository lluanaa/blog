import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
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
          {lang && <span className="post-content__code-lang">{lang}</span>}
          <pre className="post-content__pre"><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
        </div>
      )
    } else if (line.trim() === '') {
      // skip blank lines
    } else if (/^\[iframe\]\(.*?\)$/.test(line.trim())) {
      const match = line.trim().match(/^\[iframe\]\((.*?)\)$/)
      if (match) {
        elements.push(
          <iframe
            key={i}
            src={match[1]}
            className="post-content__iframe"
            title="embed"
            allowTransparency={true}
            style={{ border: 'none', background: 'transparent' }}
          />
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
  const post = getPostBySlug(slug ?? '')

  if (!post) return <Navigate to="/posts" replace />

  return (
    <div className="post-detail">
      <div className="post-detail__back fade-up">
        <button onClick={() => navigate(-1)} className="btn-ghost"> ~ voltar</button>
      </div>

      <header className="post-detail__header fade-up-2">
        <div className="post-detail__eyebrow">
          <div className="post-detail__tags">
            {post.tags.map((t) => (
              <span key={t} className="tag-pill">{t}</span>
            ))}
          </div>
          <span className="post-detail__date">{formatDate(post.date)}</span>
        </div>
        <h1 className="title-display post-detail__title">{post.title}</h1>
        <p className="post-detail__excerpt">{post.excerpt}</p>
        <div className="post-detail__meta">
          <span>◎ {post.readTime} min de leitura</span>
        </div>
      </header>

      <div className="post-detail__divider" />

      <article className="post-detail__content card fade-up-3">
        {renderContent(post.content)}
      </article>

      <div className="post-detail__comments fade-up-4">
        <Comments />
      </div>

      <div className="post-detail__footer fade-up-4">
        <Link to="/posts" className="btn-ghost">~ ver todos os posts</Link>
        <Link to="/guestbook" className="btn-primary">guestbook ♡</Link>
      </div>
    </div>
  )
}
