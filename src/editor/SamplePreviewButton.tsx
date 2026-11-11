import { useState } from 'react'
import { buildProjectExportJob } from '@/services/ffmpeg/argBuilder'
import { bytesToBlob } from '@/services/ffmpeg/bytes'
import { ffmpegRuntime } from '@/services/ffmpeg/runtime'
import { createManagedObjectUrl } from '@/workspace/objectUrls'
import { useProjectStore } from '@/workspace/projectStore'

/** Renders a few seconds of the current edit as a local sample before full export. */
export function SamplePreviewButton() {
  const project = useProjectStore((s) => s.history.present)
  const fileBlobs = useProjectStore((s) => s.fileBlobs)
  const [url, setUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState('')

  const clip = project.clips[0]
  const primary = clip ? fileBlobs[clip.assetId] : null

  const onSample = async () => {
    if (!primary) return
    setPhase('Rendering sample…')
    const sampleProject = structuredClone(project)
    const start = sampleProject.selection.start
    sampleProject.selection.end = Math.min(sampleProject.selection.end, start + 3)
    sampleProject.export.cutMode = 'precise'
    await ffmpegRuntime.ensureLoaded((e) => setPhase(e.phase))
    const inputName = 'sample_in.bin'
    const outputName = 'sample.mp4'
    const job = buildProjectExportJob(sampleProject, inputName, outputName)
    const result = await ffmpegRuntime.run({
      args: job.args,
      inputs: [{ name: inputName, data: primary }],
      outputs: [outputName],
      onProgress: (e) => setPhase(e.phase),
    })
    const blob = bytesToBlob(result[outputName], 'video/mp4')
    setUrl(createManagedObjectUrl(blob))
    setPhase('Sample ready (first ~3s of selection)')
  }

  return (
    <div>
      <button type="button" className="btn btn-ghost" disabled={!primary} onClick={() => void onSample()}>
        Render 3s sample
      </button>
      {phase && <p className="dim">{phase}</p>}
      {url && <video src={url} controls playsInline style={{ width: '100%', marginTop: 8, borderRadius: 8 }} />}
    </div>
  )
}
