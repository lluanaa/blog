import { useTranslation } from 'react-i18next'
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa'
import { SiGo, SiTypescript, SiReact, SiMongodb, SiApachekafka, SiRedis, SiPostgresql, SiKubernetes, SiNodedotjs, SiDocker } from 'react-icons/si'
import Footer from '../components/Footer'
import { useSeo } from '../hooks/useSeo'
import './About.css'

const stack = [
  // linguagens
  { icon: SiGo,          name: 'Go',          color: '#00ADD8' },
  { icon: SiTypescript,  name: 'TypeScript',  color: '#3178C6' },
  { icon: SiNodedotjs,   name: 'Node.js',     color: '#5FA04E' },
  { icon: SiReact,       name: 'React',       color: '#61DAFB' },
  // bancos
  { icon: SiMongodb,     name: 'MongoDB',     color: '#47A248' },
  { icon: SiPostgresql,  name: 'PostgreSQL',  color: '#4169E1' },
  { icon: SiRedis,       name: 'Redis',       color: '#FF4438' },
  // infra
  { icon: SiApachekafka, name: 'Kafka',       color: undefined },
  { icon: SiDocker,      name: 'Docker',      color: '#2496ED' },
  { icon: SiKubernetes,  name: 'Kubernetes',  color: '#326CE5' },
]

export default function About() {
  const { t } = useTranslation()
  const nowItems = t('about.nowItems', { returnObjects: true }) as string[]

  useSeo({ title: t('about.name'), path: '/sobre' })

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
          <div className="label-upper" style={{ marginBottom: '16px' }}>{t('about.stack')}</div>
          <div className="about-stack__icons">
            {stack.map(({ icon: Icon, name, color }) => (
              <div key={name} className="about-stack__icon-item">
                <Icon size={32} color={color} />
                <span className="about-stack__icon-name">{name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="about-links glass fade-up-4">
          <div className="label-upper" style={{ marginBottom: '14px' }}>{t('about.links')}</div>
          <div className="about-links__list">
            <a href="https://github.com/lluanaa" target="_blank" rel="noreferrer" className="about-link">
              <FaGithub size={15} className="about-link__icon" />
              <span>github</span>
            </a>
            <a href="https://www.linkedin.com/in/luanadasilvadev/" target="_blank" rel="noreferrer" className="about-link">
              <FaLinkedin size={15} className="about-link__icon" />
              <span>linkedin</span>
            </a>
            <a href="mailto:luanadasilva.dev@gmail.com" className="about-link">
              <FaEnvelope size={15} className="about-link__icon" />
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
      <Footer />
    </div>
  )
}
