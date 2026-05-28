import { useTranslation } from 'react-i18next'
import './About.css'

const stack = [
  { name: 'Go', level: 72, color: '#00acd7' },
  { name: 'React / TS', level: 85, color: '#61dafb' },
  { name: 'MongoDB', level: 78, color: '#47a248' },
  { name: 'Kafka', level: 65, color: '#ff69b4' },
  { name: 'Docker', level: 60, color: '#da70d6' },
]

export default function About() {
  const { t } = useTranslation()
  const nowItems = t('about.nowItems', { returnObjects: true }) as string[]

  return (
    <div className="about-page">
      <header className="about-header fade-up">
        <div className="about-avatar">
          <img className="about-avatar__img" src="/images/avatar.png" alt="avatar" />
          <div className="about-avatar__glow" />
        </div>
        <div>
          <h1 className="title-display about-name">{t('about.name')}</h1>
          <p className="about-tagline">{t('about.tagline')}</p>
          <span className="status-online" style={{ marginTop: '10px', display: 'inline-flex' }}>
            {t('about.online')}
          </span>
        </div>
      </header>

      <div className="about-grid">
        <div className="about-bio glass fade-up-2">
          <div className="label-upper" style={{ marginBottom: '14px' }}>{t('about.bio')}</div>
          <p className="about-bio__text">{t('about.bio1')}</p>
          <p className="about-bio__text">{t('about.bio2')}</p>
          <p className="about-bio__text">{t('about.bio3')}</p>
        </div>

        <div className="about-stack glass fade-up-3">
          <div className="label-upper" style={{ marginBottom: '14px' }}>{t('about.stack')}</div>
          {stack.map((s) => (
            <div key={s.name} className="about-stack__item">
              <div className="about-stack__row">
                <span className="about-stack__name">{s.name}</span>
                <span className="about-stack__pct">{s.level}%</span>
              </div>
              <div className="about-stack__bar">
                <div
                  className="about-stack__fill"
                  style={{ width: `${s.level}%`, background: s.color }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="about-links glass fade-up-4">
          <div className="label-upper" style={{ marginBottom: '14px' }}>{t('about.links')}</div>
          <div className="about-links__list">
            <a href="https://github.com/lluanaa" target="_blank" rel="noreferrer" className="about-link">
              <span className="about-link__icon">✦</span>
              <span>github</span>
            </a>
            <a href="https://www.linkedin.com/in/luanadasilvadev/" target="_blank" rel="noreferrer" className="about-link">
              <span className="about-link__icon">✦</span>
              <span>linkedin</span>
            </a>
            <a href="mailto:luanadasilva.dev@gmail.com" className="about-link">
              <span className="about-link__icon">✦</span>
              <span>luanadasilva.dev@gmail.com</span>
            </a>
          </div>
        </div>

        <div className="about-now glass fade-up-4">
          <div className="label-upper" style={{ marginBottom: '14px' }}>{t('about.now')}</div>
          <ul className="about-now__list">
            {nowItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
