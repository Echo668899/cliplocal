import { usePageTitle } from '@/app/usePageTitle'
import { useProjectStore } from '@/workspace/projectStore'
import styles from './StaticPage.module.css'

export function PrivacyPage() {
  usePageTitle('Privacy — ClipLocal')
  const clearWorkspace = useProjectStore((s) => s.clearWorkspace)

  return (
    <main className={`container ${styles.page}`}>
      <h1>Privacy</h1>
      <p className="muted">ClipLocal is built so your media never needs to leave this device.</p>

      <section className={`panel ${styles.section}`}>
        <h2>What stays local</h2>
        <ul>
          <li>Videos, audio, images, subtitles, and fonts you select</li>
          <li>File names, thumbnails, waveforms, edit settings, and processing logs</li>
          <li>Exported previews and downloads created in this browser</li>
        </ul>
      </section>

      <section className={`panel ${styles.section}`}>
        <h2>What the site downloads</h2>
        <p>
          The app self-hosts JavaScript, CSS, Web Workers, and FFmpeg WebAssembly cores
          (<code>@ffmpeg/core@0.12.10</code> and <code>@ffmpeg/core-mt@0.12.10</code>). Cloudflare only
          distributes these application assets from this origin (including R2-backed cores under
          <code> /ffmpeg/</code>).
        </p>
        <p>There is no third-party analytics, session replay, or remote error reporting.</p>
      </section>

      <section className={`panel ${styles.section}`}>
        <h2>Saving projects</h2>
        <p>
          By default ClipLocal uses a temporary workspace. Choose <strong>Save settings</strong> to keep
          edit decisions without copying media — when you reopen, you may need to re-select the original
          files. Choose <strong>Save to this device</strong> to also store media copies in IndexedDB.
        </p>
      </section>

      <section className={`panel ${styles.section}`}>
        <h2>Clear local data</h2>
        <p>
          Clear workspace removes temporary inputs, outputs, previews, object URLs, and saved projects on
          this device.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => void clearWorkspace()}>
          Clear workspace
        </button>
      </section>
    </main>
  )
}
