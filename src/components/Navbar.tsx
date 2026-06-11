import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './Navbar.css'

export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const { t, i18n } = useTranslation()

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/posts', label: t('nav.posts') },
    { to: '/books', label: t('nav.books') },
    { to: '/sobre', label: t('nav.about') },
  ]

  function toggleLang() {
    const next = i18n.language === 'pt-BR' ? 'en' : 'pt-BR'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  const langLabel = i18n.language === 'pt-BR'
    ? { flag: '🇺🇸', code: 'en' }
    : { flag: '🇧🇷', code: 'pt' }

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
          <span className="mobile-drawer__icon">
            {i18n.language === 'pt-BR' ? '🇺🇸' : '🇧🇷'}
          </span>
          {i18n.language === 'pt-BR' ? 'english' : 'português'}
        </button>
        <button
          className="mobile-drawer__link mobile-drawer__lang"
          onClick={() => {
            toggleTheme()
            setOpen(false)
          }}
        >
          <span className="mobile-drawer__icon">
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>

          {theme === 'dark'
            ? (i18n.language === 'pt-BR' ? 'tema claro' : 'light theme')
            : (i18n.language === 'pt-BR' ? 'tema escuro' : 'dark theme')}
        </button>
      </div>

      {open && (
        <div className="mobile-overlay" onClick={() => setOpen(false)} />
      )}

      {/* floating controls */}
      <div className="floating-controls">
        <button className="floating-btn" onClick={toggleLang} aria-label="toggle language">
          <span className="navbar__ctrl-flag">{langLabel.flag}</span>
          <span className="navbar__ctrl-code">{langLabel.code}</span>
        </button>
        <label className="navbar__switch floating-switch" aria-label="toggle theme">
          <input type="checkbox" checked={theme === 'light'} onChange={toggleTheme} />
          <span className="navbar__slider" />
          <span className="navbar__decoration" />
        </label>
      </div>
    </>
  )
}
