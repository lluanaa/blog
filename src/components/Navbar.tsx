import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Navbar.css'

export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const { t, i18n } = useTranslation()

  const links = [
    { to: '/',       label: t('nav.home') },
    { to: '/posts',  label: t('nav.posts') },
    { to: '/sobre',  label: t('nav.about') },
  ]

  function toggleLang() {
    const next = i18n.language === 'pt-BR' ? 'en' : 'pt-BR'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  const langLabel = i18n.language === 'pt-BR' ? 'en' : 'pt'

  return (
    <>
      <nav className="navbar glass">
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-dot">✦</span>
          <span className="navbar__logo-text">luana.dev</span>
          <span className="navbar__logo-dot">✦</span>
        </Link>

        {/* desktop links */}
        <ul className="navbar__links">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`navbar__link ${pathname === l.to ? 'navbar__link--active' : ''}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <button className="navbar__lang" onClick={toggleLang} aria-label="toggle language">
              {langLabel}
            </button>
          </li>
        </ul>

        {/* mobile burger */}
        <button
          className={`navbar__burger ${open ? 'navbar__burger--open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* mobile drawer */}
      <div className={`mobile-drawer glass ${open ? 'mobile-drawer--open' : ''}`}>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`mobile-drawer__link ${pathname === l.to ? 'mobile-drawer__link--active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <span className="mobile-drawer__icon">✦</span>
            {l.label}
          </Link>
        ))}
        <button
          className="mobile-drawer__link mobile-drawer__lang"
          onClick={() => { toggleLang(); setOpen(false) }}
        >
          <span className="mobile-drawer__icon">✦</span>
          {i18n.language === 'pt-BR' ? 'english' : 'português'}
        </button>
      </div>

      {open && (
        <div className="mobile-overlay" onClick={() => setOpen(false)} />
      )}
    </>
  )
}
