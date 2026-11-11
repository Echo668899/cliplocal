import { useState } from 'react'
import { usePageTitle } from '@/app/usePageTitle'
import { FileDropzone } from '@/components/FileDropzone'
import { bytesToBlob } from '@/services/ffmpeg/bytes'
import { canBrowserPreview } from '@/services/ffmpeg/mediaInfo'
import { ffmpegRuntime } from '@/services/ffmpeg/runtime'
import { createManagedObjectUrl } from '@/workspace/objectUrls'
import styles from './StaticPage.module.css'

type Row = {
  format: string
  read: string
  preview: string
  encode: string
  mux: string
  notes: string
}

const ROWS: Row[] = [
  { format: 'MP4 (H.264/AAC)', read: 'Yes', preview: 'Yes (most browsers)', encode: 'Yes (libx264/aac)', mux: 'Yes', notes: 'Primary export path' },
  { format: 'WebM (VP9/Opus)', read: 'Yes', preview: 'Yes (Chromium/Firefox)', encode: 'Yes (libvpx-vp9)', mux: 'Yes', notes: 'Validate per browser' },
  { format: 'MOV', read: 'Yes', preview: 'Sometimes', encode: 'Transcode to H.264', mux: 'Yes', notes: 'Generate local preview copy if needed' },
  { format: 'MKV', read: 'Yes', preview: 'Rarely', encode: 'Yes', mux: 'Yes', notes: 'Browser preview often needs remux/transcode' },
  { format: 'GIF', read: 'Yes', preview: 'Yes', encode: 'Yes (palette)', mux: 'Yes', notes: 'Short clips recommended' },
  { format: 'MP3 / WAV / AAC', read: 'Yes', preview: 'Yes', encode: 'Yes', mux: 'Yes', notes: 'Audio extract & replace' },
  { format: 'SRT / VTT / ASS', read: 'Yes', preview: 'Text UI', encode: 'Burn-in / soft track', mux: 'Container-dependent', notes: 'ASS styling depends on filters' },
  { format: 'PNG / JPEG / WebP', read: 'Yes', preview: 'Yes', encode: 'Yes', mux: 'image2', notes: 'Screenshots & sequences' },
  { format: 'HEVC / ProRes / exotic', read: 'Maybe', preview: 'Often no', encode: 'Limited by core', mux: 'Limited', notes: 'Mark unsupported until verified' },
]

export function FormatsPage() {
  usePageTitle('Format support — ClipLocal')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const onFiles = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (canBrowserPreview(file.type, file.name)) {
      setPreviewUrl(createManagedObjectUrl(file))
      setMessage('This browser can preview the file directly.')
      return
    }
    setMessage('Browser cannot preview this file directly. Generating a local MP4 preview copy…')
    await ffmpegRuntime.ensureLoaded()
    const out = 'preview.mp4'
    const result = await ffmpegRuntime.run({
      args: ['-hide_banner', '-y', '-i', 'input.bin', '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart', out],
      inputs: [{ name: 'input.bin', data: file }],
      outputs: [out],
    })
    const blob = bytesToBlob(result[out], 'video/mp4')
    setPreviewUrl(createManagedObjectUrl(blob))
    setMessage('Local preview copy ready (created on this device).')
  }

  return (
    <main className={`container ${styles.page}`}>
      <h1>Format support</h1>
      <p className="muted">
        Only combinations verified against the shipped FFmpeg cores are marked supported. Decode, browser preview, encode, and mux are listed separately.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Format</th>
              <th>Read</th>
              <th>Browser preview</th>
              <th>Encode</th>
              <th>Mux / export</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.format}>
                <td>{r.format}</td>
                <td>{r.read}</td>
                <td>{r.preview}</td>
                <td>{r.encode}</td>
                <td>{r.mux}</td>
                <td>{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className={`panel ${styles.section}`}>
        <h2>Generate a local preview copy</h2>
        <p className="muted">If a file can be transcoded but not played natively, ClipLocal can create a local preview MP4 without uploading.</p>
        <FileDropzone compact label="Choose media" onFiles={(f) => void onFiles(f)} />
        {message && <p>{message}</p>}
        {previewUrl && <video src={previewUrl} controls playsInline style={{ maxWidth: '100%', borderRadius: 8 }} />}
      </section>
    </main>
  )
}
