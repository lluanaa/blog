import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Post } from '../data/posts'
import './PostCard.css'

interface Props {
  post: Post
  featured?: boolean
  className?: string
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function PostCard({ post, featured = false, className = '' }: Props) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const title = isEn && post.title_en ? post.title_en : post.title
  const excerpt = isEn && post.excerpt_en ? post.excerpt_en : post.excerpt
  const locale = isEn ? 'en-US' : 'pt-BR'

  if (featured) {
    return (
      <Link to={`/posts/${post.slug}`} className={`post-featured card ${className}`} style={post.gopher ? { '--gopher-url': `url(${post.gopher})` } as React.CSSProperties : undefined}>
        <div className="post-featured__shine" />
        <div className="post-featured__eyebrow">
          <span className="label-upper">{t('postCard.featured')}</span>
          <span className="post-featured__date">{formatDate(post.date, locale)}</span>
        </div>
        <h2 className="post-featured__title title-display">{title}</h2>
        <p className="post-featured__excerpt">{excerpt}</p>
        <div className="post-featured__footer">
          <span className="btn-primary">{t('postCard.readNow')}</span>
          <div className="post-featured__stats">
            <span className="post-stat">◎ {post.readTime} min</span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/posts/${post.slug}`} className="post-mini card" style={post.gopher ? { '--gopher-url': `url(${post.gopher})` } as React.CSSProperties : undefined}>
      <div className="post-mini__shine" />
      <div className="post-mini__accent">{post.accent}</div>
      <div className="label-upper" style={{ marginBottom: '5px' }}>
        {post.tags[0]}
      </div>
      <h3 className="post-mini__title">{title}</h3>
      <div className="post-mini__meta">
        {formatDate(post.date, locale)} · {post.readTime} min
      </div>
    </Link>
  )
}
