import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

const links = [
  { to: '/',         label: 'início',    icon: '✦' },
  { to: '/posts',    label: 'posts',     icon: '✦' },
  { to: '/sobre',    label: 'sobre',     icon: '✦' },
  // { to: '/guestbook',label: 'guestbook', icon: '♡' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

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
            <span className="mobile-drawer__icon">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>

      {open && (
        <div className="mobile-overlay" onClick={() => setOpen(false)} />
      )}
    </>
  )
}
