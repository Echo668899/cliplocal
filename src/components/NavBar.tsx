import { NavLink } from 'react-router-dom'
import styles from './NavBar.module.css'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/editor', label: 'Editor' },
  { to: '/tools', label: 'Tools' },
  { to: '/formats', label: 'Formats' },
  { to: '/advanced', label: 'Advanced' },
  { to: '/privacy', label: 'Privacy' },
]

export function NavBar() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden />
          <span className={styles.name}>ClipLocal</span>
        </NavLink>
        <nav className={styles.nav} aria-label="Primary">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
