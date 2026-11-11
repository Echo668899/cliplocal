import { Link } from 'react-router-dom'
import { usePageTitle } from '@/app/usePageTitle'
import { TOOLS } from './tools/toolMeta'
import styles from './ToolsPage.module.css'

export function ToolsPage() {
  usePageTitle('Tools — ClipLocal')
  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1>Tools</h1>
        <p className="muted">Task-focused pages that reuse the same local processing engine as the full editor.</p>
      </header>
      <div className={styles.grid}>
        {TOOLS.map((tool) => (
          <Link key={tool.slug} to={`/tools/${tool.slug}`} className={`panel ${styles.card}`}>
            <h2>{tool.h1}</h2>
            <p className="muted">{tool.description}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
