import { NavLink } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
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
          ClipLocal
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
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
