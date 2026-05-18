import './About.css'

const stack = [
  { name: 'Go', level: 72, color: '#00acd7' },
  { name: 'React / TS', level: 85, color: '#61dafb' },
  { name: 'MongoDB', level: 78, color: '#47a248' },
  { name: 'Kafka', level: 65, color: '#ff69b4' },
  { name: 'Docker', level: 60, color: '#da70d6' },
]

export default function About() {
  return (
    <div className="about-page">
      <header className="about-header fade-up">
        <div className="about-avatar">
          <img className="about-avatar__img" src="/images/avatar.png" alt="avatar" />
          <div className="about-avatar__glow" />
        </div>
        <div>
          <h1 className="title-display about-name">oi, eu sou a luana</h1>
          <p className="about-tagline">dev full-stack e aspirante a devops</p>
          <span className="status-online" style={{ marginTop: '10px', display: 'inline-flex' }}>
            online
          </span>
        </div>
      </header>

      <div className="about-grid">
        <div className="about-bio glass fade-up-2">
          <div className="label-upper" style={{ marginBottom: '14px' }}>// sobre mim</div>
          <p className="about-bio__text">
            Sou dev full-stack há aproximadamente 3 anos. Já trabalhei com muitas tecnologias, mas atualmente trabalho com
            Go no backend e React/TypeScript no frontend. Junto com microserviços, Kafka, MongoDB, gRPC, o pacote completo.
          </p>
          <p className="about-bio__text">
            Esse blog é o meu cantinho para documentar o que aprendo, os bugs que me derrubam, me fazem perder noites de sono (e crescer),
            e as soluções que finalmente fazem sentido. Escrevo pra mim mesma, mas fico feliz
            se ajudar alguém no caminho. Em cada post tem o botão de feedback: se algo não fizer sentido, se tiver um erro, ou se você quiser compartilhar uma experiência parecida, me conta lá! Adoro aprender com outras pessoas.
          </p>
          <p className="about-bio__text">
            Fora do trabalho: coquetelaria, meu gato, muita música, 8 ball pool e gosto musical duvidoso.
          </p>
        </div>

        <div className="about-stack glass fade-up-3">
          <div className="label-upper" style={{ marginBottom: '14px' }}>// stack atual</div>
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
          <div className="label-upper" style={{ marginBottom: '14px' }}>// links</div>
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
          <div className="label-upper" style={{ marginBottom: '14px' }}>// agora</div>
          <ul className="about-now__list">
            <li>aprendendo sobre tudo que posso</li>
            <li>debuggando coisas que eu mesma criei e esqueci</li>
            <li>pensando em ser uma kubestronauta um dia. me falta $</li>
            <li>tomando café demais. gastrite nesse momento - moderada</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
