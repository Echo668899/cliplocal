import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/app/usePageTitle'
import { FileDropzone } from '@/components/FileDropzone'
import { useProjectStore } from '@/workspace/projectStore'
import { ffmpegRuntime } from '@/services/ffmpeg/runtime'
import styles from './HomePage.module.css'

export function HomePage() {
  usePageTitle('ClipLocal — Free browser video editor')
  const navigate = useNavigate()
  const ingestFiles = useProjectStore((s) => s.ingestFiles)
  const setEngine = useProjectStore((s) => s.setEngine)

  const onFiles = async (files: File[]) => {
    await ingestFiles(files)
    navigate('/editor')
    // Load engine in background
    void (async () => {
      try {
        setEngine({ status: 'loading', phase: 'Loading engine in background' })
        const mode = await ffmpegRuntime.ensureLoaded((e) => setEngine({ phase: e.phase, status: 'loading' }))
        setEngine({ status: 'ready', mode, phase: 'Engine ready' })
      } catch (err) {
        setEngine({
          status: 'error',
          phase: 'Engine failed to load',
          error: err instanceof Error ? err.message : String(err),
        })
      }
    })()
  }

  return (
    <main className={styles.hero}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Private browser video editor</p>
          <h1 className={styles.brand}>ClipLocal</h1>
          <p className={styles.tagline}>
            Trim, crop, caption, and export — without uploading a frame.
          </p>
          <p className={styles.privacy}>Your video stays on this device.</p>
        </div>
        <div className={styles.drop}>
          <FileDropzone onFiles={(f) => void onFiles(f)} label="Choose video" hint="Or drop a video here to start editing" />
        </div>
      </div>
    </main>
  )
}
