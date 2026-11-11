import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePageTitle } from '@/app/usePageTitle'
import { FileDropzone } from '@/components/FileDropzone'
import {
  buildCompressArgs,
  buildExtractAudioArgs,
  buildGifArgs,
  buildMergeJob,
  buildMuteArgs,
  buildScreenshotArgs,
  buildStripMetadataArgs,
} from '@/services/ffmpeg/argBuilder'
import { buildContactSheetArgs } from '@/services/ffmpeg/imageJobs'
import { bytesToBlob } from '@/services/ffmpeg/bytes'
import { ffmpegRuntime } from '@/services/ffmpeg/runtime'
import { createManagedObjectUrl } from '@/workspace/objectUrls'
import { useProjectStore } from '@/workspace/projectStore'
import { getTool } from './toolMeta'
import styles from './ToolPage.module.css'

export function ToolPage() {
  const { slug = '' } = useParams()
  const tool = getTool(slug)
  const navigate = useNavigate()
  const ingestFiles = useProjectStore((s) => s.ingestFiles)
  const project = useProjectStore((s) => s.history.present)
  const fileBlobs = useProjectStore((s) => s.fileBlobs)
  const setSelection = useProjectStore((s) => s.setSelection)
  const setCutMode = useProjectStore((s) => s.setCutMode)
  const updateClip = useProjectStore((s) => s.updateClip)
  const setProject = useProjectStore((s) => s.setProject)

  const [phase, setPhase] = useState('Idle')
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<{ url: string; name: string; bytes: number } | null>(null)
  const [probeText, setProbeText] = useState('')
  const [crf, setCrf] = useState(28)
  const [targetMb, setTargetMb] = useState(8)
  const [gifFps, setGifFps] = useState(10)
  const [shotTime, setShotTime] = useState(1)
  const [unify, setUnify] = useState(true)

  const clip = project.clips[0]
  const primary = clip ? fileBlobs[clip.assetId] : null

  const h1 = tool?.h1 ?? 'Tool'
  const description = tool?.description ?? ''
  usePageTitle(tool ? `${tool.title} — ClipLocal` : 'Tool — ClipLocal')

  const continueEditor = () => navigate('/editor')

  const runJob = async (args: string[], inputs: Array<{ name: string; data: Blob }>, outName: string, mime: string) => {
    setError(null)
    setPhase('Loading engine')
    await ffmpegRuntime.ensureLoaded((e) => setPhase(e.phase))
    setPhase('Running')
    const result = await ffmpegRuntime.run({
      args,
      inputs,
      outputs: [outName],
      onProgress: (e) => setPhase(e.phase),
    })
    const blob = bytesToBlob(result[outName], mime)
    const url = createManagedObjectUrl(blob)
    setOutput({ url, name: outName, bytes: blob.size })
    setPhase('Done')
  }

  const onFiles = async (files: File[]) => {
    await ingestFiles(files)
    setOutput(null)
    setProbeText('')
  }

  const actions = useMemo(() => {
    if (!tool) return null
    switch (tool.slug) {
      case 'trim':
        return (
          <div className={styles.controls}>
            <label className="field">
              <span>Start (s)</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={project.selection.start}
                onChange={(e) => setSelection(Number(e.target.value), project.selection.end)}
              />
            </label>
            <label className="field">
              <span>End (s)</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={project.selection.end}
                onChange={(e) => setSelection(project.selection.start, Number(e.target.value))}
              />
            </label>
            <div className={styles.row}>
              <button type="button" className="btn btn-ghost" onClick={() => setCutMode('precise')}>Precise</button>
              <button type="button" className="btn btn-ghost" onClick={() => setCutMode('fast')}>Fast</button>
            </div>
            <button type="button" className="btn btn-primary" disabled={!primary} onClick={continueEditor}>
              Continue in editor to export
            </button>
          </div>
        )
      case 'compress':
        return (
          <div className={styles.controls}>
            <label className="field"><span>CRF</span>
              <input type="number" min={18} max={36} value={crf} onChange={(e) => setCrf(Number(e.target.value))} />
            </label>
            <label className="field"><span>Target size MB (estimate)</span>
              <input type="number" min={1} value={targetMb} onChange={(e) => setTargetMb(Number(e.target.value))} />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!primary}
              onClick={() => {
                if (!primary || !clip) return
                const duration = Math.max(0.1, project.selection.end - project.selection.start || (project.assets[clip.assetId]?.duration ?? 1))
                const { args, note } = buildCompressArgs('input.bin', 'compressed.mp4', {
                  crf,
                  targetSizeMb: targetMb,
                  duration,
                })
                if (note) setPhase(note)
                void runJob(args, [{ name: 'input.bin', data: primary }], 'compressed.mp4', 'video/mp4')
              }}
            >
              Compress
            </button>
          </div>
        )
      case 'merge':
        return (
          <div className={styles.controls}>
            <label className={styles.check}>
              <input type="checkbox" checked={unify} onChange={(e) => setUnify(e.target.checked)} />
              Unify to 1280×720 @ 30fps
            </label>
            <p className="dim">Add multiple videos above, then merge.</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={project.clips.length < 2}
              onClick={() => {
                const inputs = project.clips.map((c, i) => {
                  const blob = fileBlobs[c.assetId]
                  return { name: `in${i}.bin`, data: blob }
                }).filter((x) => x.data)
                const job = buildMergeJob(
                  inputs.map((i) => i.name),
                  'merged.mp4',
                  unify ? { width: 1280, height: 720, fps: 30 } : undefined,
                )
                void runJob(job.args, inputs as Array<{ name: string; data: Blob }>, 'merged.mp4', 'video/mp4')
              }}
            >
              Merge clips
            </button>
          </div>
        )
      case 'mute':
        return (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!primary}
            onClick={() => {
              if (!primary) return
              void runJob(buildMuteArgs('input.bin', 'muted.mp4', true), [{ name: 'input.bin', data: primary }], 'muted.mp4', 'video/mp4')
            }}
          >
            Export muted MP4
          </button>
        )
      case 'extract-audio':
        return (
          <div className={styles.row}>
            {(['mp3', 'aac', 'wav'] as const).map((codec) => (
              <button
                key={codec}
                type="button"
                className="btn btn-primary"
                disabled={!primary}
                onClick={() => {
                  if (!primary) return
                  const out = `audio.${codec === 'aac' ? 'm4a' : codec}`
                  void runJob(
                    buildExtractAudioArgs('input.bin', out, codec),
                    [{ name: 'input.bin', data: primary }],
                    out,
                    codec === 'wav' ? 'audio/wav' : 'audio/mpeg',
                  )
                }}
              >
                Extract {codec.toUpperCase()}
              </button>
            ))}
          </div>
        )
      case 'add-subtitles':
        return (
          <div className={styles.controls}>
            <p className="dim">Import subtitles in the editor Subtitles panel, then export with burn-in.</p>
            <button type="button" className="btn btn-primary" onClick={continueEditor}>Continue in editor</button>
          </div>
        )
      case 'video-to-gif':
        return (
          <div className={styles.controls}>
            <label className="field"><span>GIF FPS</span>
              <input type="number" min={4} max={30} value={gifFps} onChange={(e) => setGifFps(Number(e.target.value))} />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!primary}
              onClick={() => {
                if (!primary) return
                const start = project.selection.start
                const duration = Math.min(6, Math.max(0.2, project.selection.end - project.selection.start || 3))
                void runJob(
                  buildGifArgs('input.bin', 'clip.gif', start, duration, gifFps),
                  [{ name: 'input.bin', data: primary }],
                  'clip.gif',
                  'image/gif',
                )
              }}
            >
              Make GIF
            </button>
          </div>
        )
      case 'crop':
        return (
          <div className={styles.controls}>
            <div className={styles.row}>
              {(['9:16', '1:1', '4:5', '16:9'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  className="btn btn-ghost"
                  disabled={!clip}
                  onClick={() => clip && updateClip(clip.id, { transform: { ...clip.transform, aspect: a } })}
                >
                  {a}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary" onClick={continueEditor}>Continue in editor</button>
          </div>
        )
      case 'speed':
        return (
          <div className={styles.controls}>
            <label className="field"><span>Speed</span>
              <input
                type="number"
                min={0.25}
                max={4}
                step={0.05}
                value={clip?.speed ?? 1}
                disabled={!clip}
                onChange={(e) => clip && updateClip(clip.id, { speed: Number(e.target.value) })}
              />
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={!!clip?.reverse}
                disabled={!clip}
                onChange={(e) => clip && updateClip(clip.id, { reverse: e.target.checked })}
              />
              Reverse
            </label>
            <button type="button" className="btn btn-primary" onClick={continueEditor}>Continue in editor</button>
          </div>
        )
      case 'rotate':
        return (
          <div className={styles.row}>
            {[0, 90, 180, 270].map((r) => (
              <button
                key={r}
                type="button"
                className="btn btn-ghost"
                disabled={!clip}
                onClick={() => clip && updateClip(clip.id, { transform: { ...clip.transform, rotation: r as 0 | 90 | 180 | 270 } })}
              >
                {r}°
              </button>
            ))}
            <button type="button" className="btn btn-primary" onClick={continueEditor}>Continue in editor</button>
          </div>
        )
      case 'screenshot':
        return (
          <div className={styles.controls}>
            <label className="field"><span>Time (s)</span>
              <input type="number" min={0} step={0.01} value={shotTime} onChange={(e) => setShotTime(Number(e.target.value))} />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!primary}
              onClick={() => {
                if (!primary) return
                void runJob(
                  buildScreenshotArgs('input.bin', 'frame.png', shotTime),
                  [{ name: 'input.bin', data: primary }],
                  'frame.png',
                  'image/png',
                )
              }}
            >
              Capture PNG
            </button>
          </div>
        )
      case 'probe':
        return (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!primary}
            onClick={async () => {
              if (!primary) return
              setPhase('Probing')
              await ffmpegRuntime.ensureLoaded((e) => setPhase(e.phase))
              const text = await ffmpegRuntime.probe(primary)
              setProbeText(text)
              setPhase('Done')
            }}
          >
            Run ffprobe-style inspect
          </button>
        )
      case 'contact-sheet':
        return (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!primary}
            onClick={() => {
              if (!primary) return
              void runJob(
                buildContactSheetArgs('input.bin', 'sheet.png', { interval: 2, columns: 4, width: 320 }),
                [{ name: 'input.bin', data: primary }],
                'sheet.png',
                'image/png',
              )
            }}
          >
            Build contact sheet
          </button>
        )
      case 'strip-metadata':
        return (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!primary}
            onClick={() => {
              if (!primary) return
              void runJob(
                buildStripMetadataArgs('input.bin', 'clean.mp4'),
                [{ name: 'input.bin', data: primary }],
                'clean.mp4',
                'video/mp4',
              )
            }}
          >
            Strip metadata
          </button>
        )
      default:
        return null
    }
  }, [tool, project, primary, clip, crf, targetMb, gifFps, shotTime, unify, fileBlobs])

  if (!tool) {
    return (
      <main className="container">
        <h1>Tool not found</h1>
        <Link to="/tools">Back to tools</Link>
      </main>
    )
  }

  return (
    <main className={`container ${styles.page}`}>
      <p className={styles.crumb}><Link to="/tools">Tools</Link> / {tool.h1}</p>
      <h1>{h1}</h1>
      <p className="muted">{description}</p>
      <p className="chip">Your video stays on this device.</p>

      <section className={`panel ${styles.panel}`}>
        <FileDropzone
          multiple={tool.slug === 'merge'}
          accept={tool.slug === 'add-subtitles' ? 'video/*,.srt,.vtt,.ass' : 'video/*,audio/*'}
          onFiles={(f) => void onFiles(f)}
          label={tool.slug === 'merge' ? 'Choose videos' : 'Choose file'}
          compact
        />
        {clip && (
          <p className="muted">
            Loaded: {project.assets[clip.assetId]?.name}
            {project.clips.length > 1 ? ` (+${project.clips.length - 1} more)` : ''}
          </p>
        )}
        {actions}
        <p className="dim">Status: {phase}</p>
        {error && <p className={styles.error}>{error}</p>}
        {probeText && <pre className={styles.pre}>{probeText}</pre>}
        {output && (
          <div className={styles.output}>
            {output.name.endsWith('.png') || output.name.endsWith('.gif') ? (
              <img src={output.url} alt="Output" />
            ) : output.name.match(/\.(mp3|m4a|wav)$/) ? (
              <audio src={output.url} controls />
            ) : (
              <video src={output.url} controls playsInline />
            )}
            <p>{output.name} · {(output.bytes / 1024).toFixed(1)} KB</p>
            <a className="btn btn-primary" href={output.url} download={output.name}>Download</a>
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            // ensure settings preserved
            setProject(project, false)
            continueEditor()
          }}
        >
          Keep media & open full editor
        </button>
      </section>
    </main>
  )
}
