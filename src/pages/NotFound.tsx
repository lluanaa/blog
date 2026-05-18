import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '140px 20px 60px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      textAlign: 'center',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '72px', color: 'var(--pink)', lineHeight: 1 }}>404</div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#fff' }}>página não encontrada</h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(255,180,220,0.5)', lineHeight: 1.7 }}>
        essa rota não existe, mas o blog sim ♡
      </p>
      <Link to="/" className="btn-primary" style={{ marginTop: '8px' }}>voltar pro início</Link>
    </div>
  )
}
