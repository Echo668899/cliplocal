import { useEffect, useState } from 'react'
import { usePageTitle } from '@/app/usePageTitle'
import { FileDropzone } from '@/components/FileDropzone'
import { bytesToBlob } from '@/services/ffmpeg/bytes'
import { ffmpegRuntime } from '@/services/ffmpeg/runtime'
import { createManagedObjectUrl } from '@/workspace/objectUrls'
import { deletePreset, listPresets, savePreset } from '@/workspace/storage'
import styles from './AdvancedPage.module.css'

type LocalInput = { name: string; file: File }

export function AdvancedPage() {
  usePageTitle('Advanced / FFmpeg Console — ClipLocal')
  const [inputs, setInputs] = useState<LocalInput[]>([])
  const [argsText, setArgsText] = useState('-i input0.bin -c:v libx264 -c:a aac -movflags +faststart output.mp4')
  const [outputsText, setOutputsText] = useState('output.mp4')
  const [logs, setLogs] = useState<string[]>([])
  const [phase, setPhase] = useState('Idle')
  const [results, setResults] = useState<Array<{ name: string; url: string; bytes: number }>>([])
  const [presets, setPresets] = useState<Array<{ id: string; name: string; args: string[] }>>([])
  const [presetName, setPresetName] = useState('My preset')

  useEffect(() => {
    void listPresets().then(setPresets)
  }, [])

  const parseArgs = (text: string) =>
    text
      .trim()
      .match(/(?:[^\s"]+|"[^"]*")+/g)
      ?.map((t) => t.replace(/^"|"$/g, '')) ?? []

  const onRun = async () => {
    setPhase('Loading engine')
    await ffmpegRuntime.ensureLoaded((e) => setPhase(e.phase))
    ffmpegRuntime.clearLogs()
    const args = parseArgs(argsText)
    const outputNames = outputsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setPhase('Running')
    try {
      const result = await ffmpegRuntime.run({
        args,
        inputs: inputs.map((i) => ({ name: i.name, data: i.file })),
        outputs: outputNames,
        onProgress: (e) => setPhase(e.phase),
        onLog: (line) => setLogs((prev) => [...prev, `${line.type}: ${line.message}`]),
      })
      setLogs(ffmpegRuntime.recentLogs.map((l) => `${l.type}: ${l.message}`))
      setResults(
        outputNames.map((name) => {
          const data = result[name]
          const blob = bytesToBlob(data)
          return { name, url: createManagedObjectUrl(blob), bytes: blob.size }
        }),
      )
      setPhase('Done')
    } catch (err) {
      setLogs(ffmpegRuntime.recentLogs.map((l) => `${l.type}: ${l.message}`))
      setPhase(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <main className={`container ${styles.page}`}>
      <h1>Advanced / FFmpeg Console</h1>
      <p className="muted">
        Inspect generated parameters, edit an argument array, run a local job, and download outputs. Only workspace files selected below are accessible.
      </p>

      <section className={`panel ${styles.panel}`}>
        <h2>Inputs</h2>
        <FileDropzone
          multiple
          label="Add local inputs"
          compact
          onFiles={(files) =>
            setInputs((prev) => [
              ...prev,
              ...files.map((file, idx) => ({
                name: `input${prev.length + idx}.bin`,
                file,
              })),
            ])
          }
        />
        <ul className={styles.list}>
          {inputs.map((i) => (
            <li key={i.name}>
              <code>{i.name}</code> ← {i.file.name}
            </li>
          ))}
        </ul>
      </section>

      <section className={`panel ${styles.panel}`}>
        <h2>Arguments</h2>
        <textarea className={styles.textarea} rows={5} value={argsText} onChange={(e) => setArgsText(e.target.value)} />
        <label className="field">
          <span>Output file names (comma-separated)</span>
          <input value={outputsText} onChange={(e) => setOutputsText(e.target.value)} />
        </label>
        <div className={styles.row}>
          <button type="button" className="btn btn-primary" onClick={() => void onRun()}>
            Run FFmpeg
          </button>
          <button type="button" className="btn btn-danger" onClick={() => void ffmpegRuntime.cancel()}>
            Cancel
          </button>
        </div>
        <p className="dim">{phase}</p>
      </section>

      <section className={`panel ${styles.panel}`}>
        <h2>Presets</h2>
        <div className={styles.row}>
          <input value={presetName} onChange={(e) => setPresetName(e.target.value)} />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              await savePreset(presetName, parseArgs(argsText))
              setPresets(await listPresets())
            }}
          >
            Save preset
          </button>
        </div>
        <ul className={styles.list}>
          {presets.map((p) => (
            <li key={p.id} className={styles.presetRow}>
              <button type="button" className="btn btn-ghost" onClick={() => setArgsText(p.args.join(' '))}>
                {p.name}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  await deletePreset(p.id)
                  setPresets(await listPresets())
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={`panel ${styles.panel}`}>
        <h2>Logs</h2>
        <pre className={styles.logs}>{logs.join('\n') || 'No logs yet.'}</pre>
      </section>

      {results.length > 0 && (
        <section className={`panel ${styles.panel}`}>
          <h2>Outputs</h2>
          {results.map((r) => (
            <div key={r.name} className={styles.row}>
              <span>
                {r.name} · {(r.bytes / 1024).toFixed(1)} KB
              </span>
              <a className="btn btn-primary" href={r.url} download={r.name}>
                Download
              </a>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
