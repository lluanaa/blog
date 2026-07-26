import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { posts } from '../data/posts'
import { useSeo } from '../hooks/useSeo'
import './Posts.css'

const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)))

function formatDate(iso: string, locale = 'pt-BR') {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function Posts() {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  useSeo({
    title: t('posts.title'),
    description: `${posts.length} posts sobre bugs, arquitetura, ferramentas e o dia a dia de dev.`,
    path: '/posts',
  })

  const filtered = posts.filter((p) => {
    const matchTag = !activeTag || p.tags.includes(activeTag)
    const title = isEn && p.title_en ? p.title_en : p.title
    const excerpt = isEn && p.excerpt_en ? p.excerpt_en : p.excerpt
    const matchSearch =
      !search ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      excerpt.toLowerCase().includes(search.toLowerCase())
    return matchTag && matchSearch
  })

  return (
    <div className="posts-page">
      <div className="posts-header fade-up">
        <h1 className="title-display posts-header__title">{t('posts.title')}</h1>
        <p className="posts-header__sub">
          {posts.length} posts · {t('posts.subtitle')}
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
            placeholder={t('posts.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="posts-tags">
          <button
            className={`tag-pill ${!activeTag ? 'tag-pill--active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            {t('posts.all')}
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
          <div className="posts-empty">{t('posts.empty')}</div>
        )}
        {filtered.map((p) => {
          const rowTitle = isEn && p.title_en ? p.title_en : p.title
          const rowExcerpt = isEn && p.excerpt_en ? p.excerpt_en : p.excerpt
          return (
          <Link key={p.slug} to={`/posts/${p.slug}`} className="posts-row card">
            <div className="posts-row__shine" />
            <div className="posts-row__left">
              <div className="posts-row__tags">
                {p.tags.map((tag) => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>
              <h2 className="posts-row__title">{rowTitle}</h2>
              <p className="posts-row__excerpt">{rowExcerpt}</p>
            </div>
            <div className="posts-row__right">
              <div className="posts-row__date">{formatDate(p.date, isEn ? 'en-US' : 'pt-BR')}</div>
              <div className="posts-row__meta">
                <span>✦ {p.readTime} min</span>
              </div>
              <span className="posts-row__accent">{p.accent}</span>
            </div>
          </Link>
        )})}
      </div>
    </div>
  )
}
