import PostCard from '../components/PostCard'
import Sidebar from '../components/Sidebar'
import { getFeaturedPost, getRecentPosts } from '../data/posts'
import { useTranslation } from 'react-i18next'
import './Home.css'

export default function Home() {
  const featured = getFeaturedPost()
  const recent = getRecentPosts(4)
  const { t } = useTranslation()

  return (
    <div className="home-layout">
      <main className="home-main">
        {/* titlebar strip */}
        <div className="home-titlebar fade-up">
          <div className="home-titlebar__dots">
            <span className="tb-dot" style={{ background: '#ff1493' }} />
            <span className="tb-dot" style={{ background: '#ff69b4', opacity: .6 }} />
            <span className="tb-dot" style={{ background: '#da70d6', opacity: .6 }} />
          </div>
          <span className="home-titlebar__title">computers, democracy, and nervous disorders</span>
        </div>

        <PostCard post={featured} featured className="fade-up-2" />

        <section className="home-recent fade-up-3">
          <div className="home-recent__header">
            <span className="label-upper">{t('home.recentPosts')}</span>
          </div>
          <div className="home-recent__grid">
            {recent.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      </main>

      <Sidebar />
    </div>
  )
}
