import { useEffect } from 'react'
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

  const warmEngine = () => {
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

  const onFiles = async (files: File[]) => {
    await ingestFiles(files)
    navigate('/editor')
    warmEngine()
  }

  const onSample = async () => {
    try {
      const res = await fetch('/samples/sample-60s.mp4')
      if (!res.ok) throw new Error('Sample video is not available on this deploy yet.')
      const blob = await res.blob()
      const file = new File([blob], 'sample-60s.mp4', { type: 'video/mp4' })
      await onFiles([file])
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files
      if (!files?.length) return
      void ingestFiles(Array.from(files)).then(() => {
        navigate('/editor')
        warmEngine()
      })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [ingestFiles, navigate])

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
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void onSample()}
              title="Load a short sample video to try trimming without picking a file"
            >
              Try a sample video
            </button>
          </div>
        </div>
        <div>
          <FileDropzone
            onFiles={(f) => void onFiles(f)}
            label="Choose video"
            hint="Or drop a video here. You can also paste a file."
          />
        </div>
      </div>
    </main>
  )
}
