import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/app/usePageTitle'
import { FileDropzone } from '@/components/FileDropzone'
import { ExportBar } from '@/editor/ExportBar'
import { Inspector } from '@/editor/Inspector'
import { SamplePreviewButton } from '@/editor/SamplePreviewButton'
import { Timeline } from '@/editor/Timeline'
import { VideoPreview } from '@/editor/VideoPreview'
import { useProjectStore } from '@/workspace/projectStore'
import styles from './EditorPage.module.css'

export function EditorPage() {
  usePageTitle('Editor — ClipLocal')
  const navigate = useNavigate()
  const project = useProjectStore((s) => s.history.present)
  const ingestFiles = useProjectStore((s) => s.ingestFiles)
  const hasClip = project.clips.length > 0

  return (
    <main className={styles.page}>
      <div className={`container ${styles.top}`}>
        <div>
          <h1>Editor</h1>
          <p className="muted">Preview on the timeline, then export a finished file on this device.</p>
        </div>
        {!hasClip && (
          <FileDropzone compact onFiles={(f) => void ingestFiles(f)} label="Choose video" />
        )}
      </div>

      <div className={`container ${styles.layout}`}>
        <section className={styles.main}>
          <VideoPreview />
          <Timeline />
          <SamplePreviewButton />
          <ExportBar />
        </section>
        <Inspector />
      </div>

      {hasClip && (
        <div className={`container ${styles.footerLinks}`}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/tools')}>
            Open tool directory
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/advanced')}>
            Advanced / FFmpeg Console
          </button>
        </div>
      )}
    </main>
  )
}
