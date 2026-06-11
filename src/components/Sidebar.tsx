import { useTranslation } from 'react-i18next'
import { getTodaysTrack } from '../data/nowPlaying'
import './Sidebar.css'

const emojiByDay  = ['😴', '😮‍💨', '🫠', '🙏​', '😶‍🌫️​', '🥳', '✨']
const tags = ['golang', 'react', 'kafka', 'mongodb', 'bugs', 'chaos', 'dev life', 'git', 'crying', 'typescript', 'learning', 'career']

export default function Sidebar() {
  const { t } = useTranslation()
  const trackId = getTodaysTrack()
  const dayIndex = new Date().getDay()
  const emoji  = emojiByDay[dayIndex]
  const moodTexts = t('sidebar.moodText', { returnObjects: true }) as string[]
  const moodText = moodTexts[dayIndex]

  return (
    <aside className="sidebar">
      {/* profile */}
      <div className="glass sidebar-profile">
        <div className="sidebar-avatar">
          <img className="sidebar-avatar__img" src="/images/avatar.png" alt="avatar" />
          <div className="sidebar-avatar__glow" />
        </div>
        <div className="sidebar-profile__greeting">{t('sidebar.greeting')}</div>
        <div className="sidebar-profile__bio">{t('sidebar.bio')}</div>
        <span className="status-online">{t('sidebar.online')}</span>
      </div>

      {/* música do dia */}
      <div className="glass sidebar-music">
        <div className="label-upper" style={{ marginBottom: '10px' }}>{t('sidebar.music')}</div>
        <iframe
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
          width="100%"
          height="152"
          style={{ border: 'none' }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="música do dia"
        />
      </div>

      {/* mood */}
      <div className="glass sidebar-mood">
        <div className="label-upper" style={{ marginBottom: '12px' }}>{t('sidebar.mood')}</div>
        <div className="sidebar-mood__terminal">
          <span className="sidebar-mood__prompt">$ mood --today</span>
          <span className="sidebar-mood__output">
            <span className="sidebar-mood__emoji">{emoji}</span>
            {moodText}
          </span>
        </div>
      </div>

      {/* tags */}
      <div className="glass sidebar-tags">
        <div className="label-upper" style={{ marginBottom: '10px' }}>{t('sidebar.tags')}</div>
        <div className="sidebar-tags__list">
          {tags.map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
      </div>
    </aside>
  )
}
