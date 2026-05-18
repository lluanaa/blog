import { getTodaysTrack } from '../data/nowPlaying'
import './Sidebar.css'

const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const energyByDay = [30, 20, 45, 55, 60, 80, 99]
const emojiByDay  = ['😴', '😮‍💨', '🫠', '🙏​', '😶‍🌫️​', '🥳', '✨']
const tags = ['golang', 'react', 'kafka', 'mongodb', 'bugs', 'caos', 'vida dev', 'git', 'choro', 'typescript']

export default function Sidebar() {
  const track = getTodaysTrack()
  const dayIndex = new Date().getDay()
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
        <div className="sidebar-profile__greeting">oi, eu sou a luana</div>
        <div className="sidebar-profile__bio">dev & mais umas coisas</div>
        <span className="status-online">online</span>

      </div>

      {/* música do dia */}
      <div className="glass sidebar-music">
        <div className="label-upper" style={{ marginBottom: '10px' }}>// música do dia</div>
        <iframe
          src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator`}
          width="100%"
          height="152"
          style={{ border: 'none' }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={track.label}
        />
      </div>

      {/* mood */}
      <div className="glass sidebar-mood">
        <div className="label-upper" style={{ marginBottom: '10px' }}>// humor</div>
        <div className="sidebar-mood__emoji">{emoji}</div>
        <div className="sidebar-mood__label">energia de {today}: {energy}%</div>
        <div className="sidebar-mood__bar">
          <div className="sidebar-mood__fill" style={{ width: `${energy}%` }} />
        </div>
      </div>

      {/* tags */}
      <div className="glass sidebar-tags">
        <div className="label-upper" style={{ marginBottom: '10px' }}>// tags</div>
        <div className="sidebar-tags__list">
          {tags.map((t) => (
            <span key={t} className="tag-pill">{t}</span>
          ))}
        </div>
      </div>
    </aside>
  )
}
