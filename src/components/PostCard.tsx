import { Link } from 'react-router-dom'
import type { Post } from '../data/posts'
import './PostCard.css'

interface Props {
  post: Post
  featured?: boolean
  className?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function PostCard({ post, featured = false, className = '' }: Props) {
  if (featured) {
    return (
      <Link to={`/posts/${post.slug}`} className={`post-featured card ${className}`}>
        <div className="post-featured__shine" />
        <div className="post-featured__eyebrow">
          <span className="label-upper">✦ destaque</span>
          <span className="post-featured__date">{formatDate(post.date)}</span>
        </div>
        <h2 className="post-featured__title title-display">{post.title}</h2>
        <p className="post-featured__excerpt">{post.excerpt}</p>
        <div className="post-featured__footer">
          <span className="btn-primary">ler agora ~</span>
          <div className="post-featured__stats">
            <span className="post-stat">◎ {post.readTime} min</span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/posts/${post.slug}`} className="post-mini card">
      <div className="post-mini__shine" />
      <div className="post-mini__accent">{post.accent}</div>
      <div className="label-upper" style={{ marginBottom: '5px' }}>
        {post.tags[0]}
      </div>
      <h3 className="post-mini__title">{post.title}</h3>
      <div className="post-mini__meta">
        {formatDate(post.date)} · {post.readTime} min
      </div>
    </Link>
  )
}
