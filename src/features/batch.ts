import { buildStripMetadataArgs } from '@/services/ffmpeg/argBuilder'
import { bytesToBlob } from '@/services/ffmpeg/bytes'
import { ffmpegRuntime } from '@/services/ffmpeg/runtime'
import { createManagedObjectUrl } from '@/workspace/objectUrls'

export async function applyPresetToFiles(
  files: File[],
  argsTemplate: string[],
  outputExt = 'mp4',
  onProgress?: (phase: string, index: number) => void,
) {
  await ffmpegRuntime.ensureLoaded((e) => onProgress?.(e.phase, -1))
  const outputs: Array<{ name: string; url: string; bytes: number }> = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress?.(`Processing ${file.name}`, i)
    const inputName = 'batch_input.bin'
    const outputName = `batch_out_${i}.${outputExt}`
    const args = argsTemplate.map((token) =>
      token === '$INPUT' ? inputName : token === '$OUTPUT' ? outputName : token,
    )
    const result = await ffmpegRuntime.run({
      args,
      inputs: [{ name: inputName, data: file }],
      outputs: [outputName],
    })
    const blob = bytesToBlob(result[outputName])
    outputs.push({
      name: `${file.name.replace(/\.[^.]+$/, '')}_out.${outputExt}`,
      url: createManagedObjectUrl(blob),
      bytes: blob.size,
    })
  }

  return outputs
}

export async function stripMetadataBatch(files: File[]) {
  return applyPresetToFiles(
    files,
    buildStripMetadataArgs('$INPUT', '$OUTPUT'),
    'mp4',
  )
}
