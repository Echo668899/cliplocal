import { buildTrimJob } from '@/services/ffmpeg/argBuilder'
import { exportProject } from '@/services/ffmpeg/exportService'
import { exportProjectWithOptionalBgm } from '@/services/ffmpeg/exportWithAudio'
import { ffmpegRuntime } from '@/services/ffmpeg/runtime'
import { useProjectStore } from '@/workspace/projectStore'
import styles from './ExportBar.module.css'

export function ExportBar() {
  const project = useProjectStore((s) => s.history.present)
  const fileBlobs = useProjectStore((s) => s.fileBlobs)
  const engine = useProjectStore((s) => s.engine)
  const exportResult = useProjectStore((s) => s.exportResult)
  const setEngine = useProjectStore((s) => s.setEngine)
  const setExportResult = useProjectStore((s) => s.setExportResult)
  const setAbortController = useProjectStore((s) => s.setAbortController)
  const abortController = useProjectStore((s) => s.abortController)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const resetToOriginal = useProjectStore((s) => s.resetToOriginal)
  const saveSettingsOnly = useProjectStore((s) => s.saveSettingsOnly)
  const saveWithMedia = useProjectStore((s) => s.saveWithMedia)
  const clearWorkspace = useProjectStore((s) => s.clearWorkspace)

  const clip = project.clips[0]
  const primaryBlob = clip ? fileBlobs[clip.assetId] : null
  const previewArgs = clip
    ? buildTrimJob(project, 'input.bin', `output.${project.export.container}`).args
    : []

  const onExport = async () => {
    if (!primaryBlob || !clip) return
    const ac = new AbortController()
    setAbortController(ac)
    setEngine({ status: 'running', phase: 'Starting export', error: undefined })
    try {
      if (!ffmpegRuntime.isLoaded) {
        setEngine({ status: 'loading', phase: 'Loading engine' })
        const mode = await ffmpegRuntime.ensureLoaded((e) => setEngine({ phase: e.phase }))
        setEngine({ status: 'ready', mode, phase: 'Engine ready' })
      }
      setEngine({ status: 'running', phase: 'Exporting' })
      const bgmId = project.audio.bgmAssetId
      const bgmBlob = bgmId ? fileBlobs[bgmId] : undefined
      const progress = (e: { phase: string; time?: number }) =>
        setEngine({
          status: 'running',
          phase: e.time != null ? `${e.phase} · ${e.time.toFixed(1)}s` : e.phase,
        })
      const result = bgmBlob
        ? await exportProjectWithOptionalBgm({
            project,
            primaryBlob,
            bgmBlob,
            signal: ac.signal,
            onProgress: progress,
          })
        : await exportProject({
            project,
            primaryBlob,
            signal: ac.signal,
            onProgress: progress,
          })
      setExportResult(result)
      setEngine({ status: 'ready', phase: 'Export complete', mode: ffmpegRuntime.coreMode })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('cancel') || message.includes('Abort')) {
        setEngine({ status: 'ready', phase: 'Export cancelled — edits kept', mode: ffmpegRuntime.coreMode })
      } else {
        const oom = /memory|allocation|out of memory/i.test(message)
        setEngine({
          status: 'error',
          phase: 'Export failed',
          error: oom
            ? `${message}. Try a shorter selection, lower resolution, or lower export quality.`
            : message,
          mode: ffmpegRuntime.coreMode,
        })
      }
    } finally {
      setAbortController(null)
    }
  }

  const onCancel = async () => {
    abortController?.abort()
    await ffmpegRuntime.cancel()
    setEngine({ status: 'ready', phase: 'Export cancelled — edits kept', mode: null })
  }

  return (
    <div className={styles.root}>
      <div className={styles.actions}>
        <button type="button" className="btn btn-ghost" onClick={undo}>Undo</button>
        <button type="button" className="btn btn-ghost" onClick={redo}>Redo</button>
        <button type="button" className="btn btn-ghost" onClick={resetToOriginal}>Reset to original</button>
        <button type="button" className="btn btn-ghost" onClick={() => void saveSettingsOnly()}>Save settings</button>
        <button type="button" className="btn btn-ghost" onClick={() => void saveWithMedia()}>Save to this device</button>
        <button type="button" className="btn btn-danger" onClick={() => void clearWorkspace()}>Clear workspace</button>
      </div>

      <div className={styles.exportRow}>
        <div className={styles.status}>
          <span className="chip">{engine.mode === 'mt' ? 'Multi-thread' : engine.mode === 'st' ? 'Single-thread' : 'Engine'}</span>
          <span className="muted">{engine.phase}</span>
          {engine.error && <span className={styles.error}>{engine.error}</span>}
        </div>
        {engine.status === 'running' ? (
          <button type="button" className="btn btn-danger" onClick={() => void onCancel()}>Cancel export</button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!primaryBlob} onClick={() => void onExport()}>
            Export {project.export.container.toUpperCase()}
          </button>
        )}
      </div>

      {previewArgs.length > 0 && (
        <details className={styles.args}>
          <summary>FFmpeg parameters</summary>
          <code>{previewArgs.join(' ')}</code>
        </details>
      )}

      {exportResult && (
        <div className={styles.result}>
          <video src={exportResult.url} controls playsInline className={styles.resultVideo} />
          <div className={styles.resultMeta}>
            <p>
              Exported <strong>{exportResult.name}</strong> · {(exportResult.bytes / (1024 * 1024)).toFixed(2)} MB
            </p>
            {exportResult.notes.map((n) => (
              <p key={n} className="dim">{n}</p>
            ))}
            <a className="btn btn-primary" href={exportResult.url} download={exportResult.name}>
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
