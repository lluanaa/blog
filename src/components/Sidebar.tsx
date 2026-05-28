import { useTranslation } from 'react-i18next'
import { getTodaysTrack } from '../data/nowPlaying'
import './Sidebar.css'

const energyByDay = [30, 20, 45, 55, 60, 80, 99]
const emojiByDay  = ['😴', '😮‍💨', '🫠', '🙏​', '😶‍🌫️​', '🥳', '✨']
const tags = ['golang', 'react', 'kafka', 'mongodb', 'bugs', 'chaos', 'dev life', 'git', 'crying', 'typescript', 'learning', 'career']

export default function Sidebar() {
  const { t } = useTranslation()
  const trackId = getTodaysTrack()
  const dayIndex = new Date().getDay()
  const days = t('sidebar.days', { returnObjects: true }) as string[]
  const today = days[dayIndex]
  const energy = energyByDay[dayIndex]
  const emoji  = emojiByDay[dayIndex]

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
        <div className="label-upper" style={{ marginBottom: '10px' }}>{t('sidebar.mood')}</div>
        <div className="sidebar-mood__emoji">{emoji}</div>
        <div className="sidebar-mood__label">{t('sidebar.energy', { day: today, pct: energy })}</div>
        <div className="sidebar-mood__bar">
          <div className="sidebar-mood__fill" style={{ width: `${energy}%` }} />
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
