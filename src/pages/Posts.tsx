import { useState } from 'react'
import { Link } from 'react-router-dom'
import { posts } from '../data/posts'
import './Posts.css'

const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)))

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function Posts() {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = posts.filter((p) => {
    const matchTag = !activeTag || p.tags.includes(activeTag)
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(search.toLowerCase())
    return matchTag && matchSearch
  })

  return (
    <div className="posts-page">
      <div className="posts-header fade-up">
        <h1 className="title-display posts-header__title">// posts</h1>
        <p className="posts-header__sub">
          {posts.length} posts · debugs, aprendizados e devaneios
        </p>
      </div>

      <div className="posts-controls fade-up-2">
        <div className="posts-search glass">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#ff1493" strokeWidth="1.2"/>
            <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#ff1493" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="posts-tags">
          <button
            className={`tag-pill ${!activeTag ? 'tag-pill--active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            todos
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              className={`tag-pill ${activeTag === t ? 'tag-pill--active' : ''}`}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="posts-list fade-up-3">
        {filtered.length === 0 && (
          <div className="posts-empty">nenhum post encontrado :(</div>
        )}
        {filtered.map((p) => (
          <Link key={p.slug} to={`/posts/${p.slug}`} className="posts-row card">
            <div className="posts-row__shine" />
            <div className="posts-row__left">
              <div className="posts-row__tags">
                {p.tags.map((t) => (
                  <span key={t} className="tag-pill">{t}</span>
                ))}
              </div>
              <h2 className="posts-row__title">{p.title}</h2>
              <p className="posts-row__excerpt">{p.excerpt}</p>
            </div>
            <div className="posts-row__right">
              <div className="posts-row__date">{formatDate(p.date)}</div>
              <div className="posts-row__meta">
                <span>◎ {p.readTime} min</span>
              </div>
              <span className="posts-row__accent">{p.accent}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
