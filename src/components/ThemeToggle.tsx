import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  localStorage.setItem('cliplocal-theme', theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const saved = localStorage.getItem('cliplocal-theme') as Theme | null
    const next = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
    setTheme(next)
    applyTheme(next)
  }, [])

  const cycle = () => {
    const order: Theme[] = ['system', 'light', 'dark']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={cycle}
      aria-label={`Theme: ${theme}`}
      title="Cycle theme: Auto → Light → Dark"
    >
      {theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
    </button>
  )
}
