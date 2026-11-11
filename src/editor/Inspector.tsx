import { useProjectStore } from '@/workspace/projectStore'
import type { AspectPreset } from '@/edit-graph/types'
import { parseSrt } from '@/services/ffmpeg/exportService'
import styles from './Inspector.module.css'

const tools = [
  { id: 'trim', label: 'Trim' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'frame', label: 'Frame' },
  { id: 'color', label: 'Color' },
  { id: 'audio', label: 'Audio' },
  { id: 'text', label: 'Text' },
  { id: 'subs', label: 'Subtitles' },
  { id: 'export', label: 'Export' },
]

export function Inspector() {
  const project = useProjectStore((s) => s.history.present)
  const selectedTool = useProjectStore((s) => s.selectedTool)
  const setSelectedTool = useProjectStore((s) => s.setSelectedTool)
  const setCutMode = useProjectStore((s) => s.setCutMode)
  const updateClip = useProjectStore((s) => s.updateClip)
  const setProject = useProjectStore((s) => s.setProject)
  const splitSelectedClip = useProjectStore((s) => s.splitSelectedClip)
  const deleteRange = useProjectStore((s) => s.deleteRange)
  const addTextOverlay = useProjectStore((s) => s.addTextOverlay)
  const reorderClips = useProjectStore((s) => s.reorderClips)

  const clip = project.clips[0]
  if (!clip) {
    return <aside className={`panel ${styles.root}`}><p className="muted">Select a clip to edit properties.</p></aside>
  }

  return (
    <aside className={`panel ${styles.root}`}>
      <div className={styles.tabs}>
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            className={selectedTool === t.id ? styles.tabActive : styles.tab}
            onClick={() => setSelectedTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {selectedTool === 'trim' && (
          <div className={styles.stack}>
            <h3>Cut mode</h3>
            <div className={styles.row}>
              <button
                type="button"
                className={project.export.cutMode === 'precise' ? 'btn btn-primary' : 'btn btn-ghost'}
                onClick={() => setCutMode('precise')}
              >
                Precise cut
              </button>
              <button
                type="button"
                className={project.export.cutMode === 'fast' ? 'btn btn-primary' : 'btn btn-ghost'}
                onClick={() => setCutMode('fast')}
              >
                Fast cut
              </button>
            </div>
            <p className="dim">
              Precise cut re-encodes so start/end follow source timestamps. Fast cut copies streams when possible; cuts may snap to keyframes.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => splitSelectedClip((project.selection.start + project.selection.end) / 2)}
            >
              Split at midpoint
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => deleteRange(project.selection.start, project.selection.end)}
            >
              Delete selection (keep sides)
            </button>
          </div>
        )}

        {selectedTool === 'timeline' && (
          <div className={styles.stack}>
            <h3>Clips ({project.clips.length})</h3>
            {project.clips.map((c, i) => (
              <div key={c.id} className={styles.clipRow}>
                <span>{c.label}</span>
                <div className={styles.row}>
                  <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => reorderClips(i, i - 1)}>Up</button>
                  <button type="button" className="btn btn-ghost" disabled={i === project.clips.length - 1} onClick={() => reorderClips(i, i + 1)}>Down</button>
                </div>
              </div>
            ))}
            <label className="field">
              <span>Speed</span>
              <input
                type="number"
                min={0.25}
                max={4}
                step={0.05}
                value={clip.speed}
                onChange={(e) => updateClip(clip.id, { speed: Number(e.target.value) })}
              />
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={clip.reverse}
                onChange={(e) => updateClip(clip.id, { reverse: e.target.checked })}
              />
              Reverse
            </label>
            <label className="field">
              <span>Fade in (s)</span>
              <input type="number" min={0} step={0.1} value={clip.fadeIn} onChange={(e) => updateClip(clip.id, { fadeIn: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Fade out (s)</span>
              <input type="number" min={0} step={0.1} value={clip.fadeOut} onChange={(e) => updateClip(clip.id, { fadeOut: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Transition out</span>
              <select
                value={clip.transitionOut}
                onChange={(e) => updateClip(clip.id, { transitionOut: e.target.value as typeof clip.transitionOut })}
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="dissolve">Dissolve</option>
                <option value="wipeleft">Wipe left</option>
                <option value="wiperight">Wipe right</option>
              </select>
            </label>
            <p className="approx-note">
              Multi-clip transitions apply when exporting a merged timeline via the Merge tool or Advanced console. Single-clip export uses fades on the active selection.
            </p>
            <label className="field">
              <span>Freeze at (s on source)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={clip.freezeAt ?? ''}
                onChange={(e) => updateClip(clip.id, { freezeAt: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </label>
            <label className="field">
              <span>Freeze duration (s)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={clip.freezeDuration ?? 0}
                onChange={(e) => updateClip(clip.id, { freezeDuration: Number(e.target.value) })}
              />
            </label>
          </div>
        )}

        {selectedTool === 'frame' && (
          <div className={styles.stack}>
            <h3>Aspect & framing</h3>
            <div className={styles.row}>
              {(['free', '16:9', '9:16', '1:1', '4:5'] as AspectPreset[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  className={clip.transform.aspect === a ? 'btn btn-primary' : 'btn btn-ghost'}
                  onClick={() => updateClip(clip.id, { transform: { ...clip.transform, aspect: a } })}
                >
                  {a}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Fit</span>
              <select
                value={clip.transform.fitMode ?? 'cover'}
                onChange={(e) =>
                  updateClip(clip.id, {
                    transform: { ...clip.transform, fitMode: e.target.value as 'cover' | 'contain-pad' },
                  })
                }
              >
                <option value="cover">Crop to fill</option>
                <option value="contain-pad">Fit + pad</option>
              </select>
            </label>
            <label className="field">
              <span>Rotation</span>
              <select
                value={clip.transform.rotation ?? 0}
                onChange={(e) =>
                  updateClip(clip.id, {
                    transform: { ...clip.transform, rotation: Number(e.target.value) as 0 | 90 | 180 | 270 },
                  })
                }
              >
                <option value={0}>0°</option>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={!!clip.transform.flipH}
                onChange={(e) => updateClip(clip.id, { transform: { ...clip.transform, flipH: e.target.checked } })}
              />
              Flip horizontal
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={!!clip.transform.flipV}
                onChange={(e) => updateClip(clip.id, { transform: { ...clip.transform, flipV: e.target.checked } })}
              />
              Flip vertical
            </label>
            <label className="field">
              <span>Crop X / Y / W / H (px)</span>
              <div className={styles.row}>
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
                  <input
                    key={k}
                    type="number"
                    placeholder={k}
                    value={clip.transform.crop?.[k] ?? ''}
                    onChange={(e) => {
                      const crop = {
                        x: clip.transform.crop?.x ?? 0,
                        y: clip.transform.crop?.y ?? 0,
                        w: clip.transform.crop?.w ?? (project.assets[clip.assetId]?.width ?? 1280),
                        h: clip.transform.crop?.h ?? (project.assets[clip.assetId]?.height ?? 720),
                        [k]: Number(e.target.value),
                      }
                      updateClip(clip.id, { transform: { ...clip.transform, crop } })
                    }}
                  />
                ))}
              </div>
            </label>
          </div>
        )}

        {selectedTool === 'color' && (
          <div className={styles.stack}>
            <h3>Color & effects</h3>
            {(
              [
                ['brightness', -1, 1, 0.05],
                ['contrast', 0, 2, 0.05],
                ['saturation', 0, 3, 0.05],
                ['blur', 0, 20, 0.5],
                ['sharpen', 0, 5, 0.1],
              ] as const
            ).map(([key, min, max, step]) => (
              <label key={key} className="field">
                <span>{key}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={clip.color[key]}
                  onChange={(e) =>
                    updateClip(clip.id, { color: { ...clip.color, [key]: Number(e.target.value) } })
                  }
                />
              </label>
            ))}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={clip.color.grayscale}
                onChange={(e) => updateClip(clip.id, { color: { ...clip.color, grayscale: e.target.checked } })}
              />
              Grayscale
            </label>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                updateClip(clip.id, {
                  blurRegions: [
                    ...clip.blurRegions,
                    { id: crypto.randomUUID(), x: 100, y: 100, w: 160, h: 120, strength: 12 },
                  ],
                })
              }
            >
              Add blur region
            </button>
            <p className="approx-note">
              Region blur currently applies a full-frame blur strength for export reliability. Precise boxed blur is available in Advanced.
            </p>
          </div>
        )}

        {selectedTool === 'audio' && (
          <div className={styles.stack}>
            <h3>Audio</h3>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={project.audio.muteOriginal}
                onChange={(e) => {
                  const doc = structuredClone(project)
                  doc.audio.muteOriginal = e.target.checked
                  setProject(doc)
                }}
              />
              Mute original
            </label>
            <label className="field">
              <span>Original volume</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={project.audio.originalVolume}
                onChange={(e) => {
                  const doc = structuredClone(project)
                  doc.audio.originalVolume = Number(e.target.value)
                  setProject(doc)
                }}
              />
            </label>
            <label className="field">
              <span>Background music</span>
              <input
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const assets = await useProjectStore.getState().ingestFiles([file])
                  const audio = assets.find((a) => a.kind === 'audio')
                  if (!audio) return
                  const doc = structuredClone(useProjectStore.getState().project())
                  doc.audio.bgmAssetId = audio.id
                  setProject(doc)
                }}
              />
            </label>
            <label className="field">
              <span>BGM volume</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={project.audio.bgmVolume}
                onChange={(e) => {
                  const doc = structuredClone(project)
                  doc.audio.bgmVolume = Number(e.target.value)
                  setProject(doc)
                }}
              />
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={project.audio.loudnorm}
                onChange={(e) => {
                  const doc = structuredClone(project)
                  doc.audio.loudnorm = e.target.checked
                  setProject(doc)
                }}
              />
              Loudness normalize
            </label>
            <label className="field">
              <span>Fade in / out (s)</span>
              <div className={styles.row}>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={project.audio.fadeIn}
                  onChange={(e) => {
                    const doc = structuredClone(project)
                    doc.audio.fadeIn = Number(e.target.value)
                    setProject(doc)
                  }}
                />
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={project.audio.fadeOut}
                  onChange={(e) => {
                    const doc = structuredClone(project)
                    doc.audio.fadeOut = Number(e.target.value)
                    setProject(doc)
                  }}
                />
              </div>
            </label>
          </div>
        )}

        {selectedTool === 'text' && (
          <div className={styles.stack}>
            <h3>Text & watermark</h3>
            <button type="button" className="btn btn-primary" onClick={() => addTextOverlay('ClipLocal')}>
              Add text
            </button>
            {clip.texts.map((t) => (
              <div key={t.id} className={styles.clipRow}>
                <input
                  value={t.text}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      texts: clip.texts.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)),
                    })
                  }
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => updateClip(clip.id, { texts: clip.texts.filter((x) => x.id !== t.id) })}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedTool === 'subs' && (
          <div className={styles.stack}>
            <h3>Subtitles</h3>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={project.subtitles.burnIn}
                onChange={(e) => {
                  const doc = structuredClone(project)
                  doc.subtitles.burnIn = e.target.checked
                  setProject(doc)
                }}
              />
              Burn in on export
            </label>
            <label className="field">
              <span>Import SRT / VTT</span>
              <input
                type="file"
                accept=".srt,.vtt,.ass,text/plain"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const text = await file.text()
                  const cues = parseSrt(text)
                  const doc = structuredClone(project)
                  doc.subtitles.cues = cues
                  setProject(doc)
                }}
              />
            </label>
            <p className="dim">{project.subtitles.cues.length} cues loaded</p>
            {project.subtitles.cues.slice(0, 5).map((c) => (
              <div key={c.id} className={styles.clipRow}>
                <span className="dim">{c.start.toFixed(1)}–{c.end.toFixed(1)}</span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        )}

        {selectedTool === 'export' && (
          <div className={styles.stack}>
            <h3>Export settings</h3>
            <label className="field">
              <span>Container</span>
              <select
                value={project.export.container}
                onChange={(e) => {
                  const doc = structuredClone(project)
                  doc.export.container = e.target.value as typeof doc.export.container
                  setProject(doc)
                }}
              >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="mkv">MKV</option>
                <option value="mov">MOV</option>
                <option value="gif">GIF</option>
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
              </select>
            </label>
            <label className="field">
              <span>CRF (quality)</span>
              <input
                type="number"
                min={14}
                max={36}
                value={project.export.crf ?? 23}
                onChange={(e) => {
                  const doc = structuredClone(project)
                  doc.export.crf = Number(e.target.value)
                  setProject(doc)
                }}
              />
            </label>
            <label className="field">
              <span>Width / Height (optional)</span>
              <div className={styles.row}>
                <input
                  type="number"
                  placeholder="W"
                  value={project.export.width ?? ''}
                  onChange={(e) => {
                    const doc = structuredClone(project)
                    doc.export.width = e.target.value ? Number(e.target.value) : undefined
                    setProject(doc)
                  }}
                />
                <input
                  type="number"
                  placeholder="H"
                  value={project.export.height ?? ''}
                  onChange={(e) => {
                    const doc = structuredClone(project)
                    doc.export.height = e.target.value ? Number(e.target.value) : undefined
                    setProject(doc)
                  }}
                />
              </div>
            </label>
            <label className="field">
              <span>Target size MB (estimate)</span>
              <input
                type="number"
                min={1}
                value={project.export.targetSizeMb ?? ''}
                onChange={(e) => {
                  const doc = structuredClone(project)
                  doc.export.targetSizeMb = e.target.value ? Number(e.target.value) : undefined
                  setProject(doc)
                }}
              />
            </label>
          </div>
        )}
      </div>
    </aside>
  )
}
