import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { preferredCoreMode, type CoreMode } from './detect'

export type ProgressEvent = {
  phase: string
  ratio?: number
  time?: number
}

export type LogLine = { type: string; message: string }

type RunOptions = {
  args: string[]
  inputs?: Array<{ name: string; data: Blob | File | Uint8Array }>
  outputs?: string[]
  signal?: AbortSignal
  onProgress?: (e: ProgressEvent) => void
  onLog?: (line: LogLine) => void
}

class FFmpegRuntime {
  private ffmpeg: FFmpeg | null = null
  private loading: Promise<void> | null = null
  private mode: CoreMode | null = null
  private busy = false
  private logs: LogLine[] = []

  get isLoaded() {
    return !!this.ffmpeg?.loaded
  }

  get coreMode() {
    return this.mode
  }

  get recentLogs() {
    return this.logs.slice(-400)
  }

  clearLogs() {
    this.logs = []
  }

  async ensureLoaded(onProgress?: (e: ProgressEvent) => void): Promise<CoreMode> {
    if (this.ffmpeg?.loaded && this.mode) return this.mode
    if (this.loading) {
      await this.loading
      return this.mode!
    }

    this.loading = this.loadInternal(onProgress)
    try {
      await this.loading
      return this.mode!
    } finally {
      this.loading = null
    }
  }

  private async loadInternal(onProgress?: (e: ProgressEvent) => void) {
    const mode = preferredCoreMode()
    onProgress?.({ phase: mode === 'mt' ? 'Loading multi-thread engine' : 'Loading single-thread engine' })

    const ffmpeg = new FFmpeg()
    ffmpeg.on('log', ({ type, message }) => {
      const line = { type, message }
      this.logs.push(line)
      if (this.logs.length > 2000) this.logs = this.logs.slice(-1000)
    })
    ffmpeg.on('progress', ({ progress, time }) => {
      onProgress?.({
        phase: 'Processing',
        ratio: Number.isFinite(progress) ? progress : undefined,
        time: typeof time === 'number' ? time / 1_000_000 : undefined,
      })
    })

    const base = mode === 'mt' ? '/ffmpeg/core-mt' : '/ffmpeg/core'
    const urls: Record<string, string> = {
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    }
    if (mode === 'mt') {
      urls.workerURL = await toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript')
    }

    await ffmpeg.load(urls)
    this.ffmpeg = ffmpeg
    this.mode = mode
    onProgress?.({ phase: 'Engine ready' })
  }

  async probe(file: Blob | File): Promise<string> {
    await this.ensureLoaded()
    const ffmpeg = this.ffmpeg!
    const name = `probe_${Date.now()}.bin`
    await ffmpeg.writeFile(name, await fetchFile(file))
    const logs: string[] = []
    const handler = ({ message }: { message: string }) => logs.push(message)
    ffmpeg.on('log', handler)
    try {
      // ffprobe-style via ffmpeg -i
      await ffmpeg.exec(['-hide_banner', '-i', name])
    } catch {
      // ffmpeg exits non-zero when only probing
    }
    ffmpeg.off('log', handler)
    await ffmpeg.deleteFile(name).catch(() => undefined)
    return logs.join('\n')
  }

  async run(options: RunOptions): Promise<Record<string, Uint8Array>> {
    if (this.busy) throw new Error('Another FFmpeg task is already running')
    this.busy = true
    const ffmpeg = this.ffmpeg!
    if (!ffmpeg?.loaded) {
      this.busy = false
      throw new Error('FFmpeg is not loaded')
    }

    const written: string[] = []
    const abortHandler = () => {
      try {
        ffmpeg.terminate()
      } catch {
        /* ignore */
      }
    }

    try {
      options.onProgress?.({ phase: 'Writing inputs' })
      for (const input of options.inputs ?? []) {
        const payload =
          input.data instanceof Uint8Array
            ? input.data
            : await fetchFile(input.data)
        await ffmpeg.writeFile(input.name, payload)
        written.push(input.name)
      }

      if (options.signal) {
        if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        options.signal.addEventListener('abort', abortHandler, { once: true })
      }

      options.onProgress?.({ phase: 'Running FFmpeg' })
      await ffmpeg.exec(options.args)

      const result: Record<string, Uint8Array> = {}
      for (const out of options.outputs ?? []) {
        const data = await ffmpeg.readFile(out)
        if (typeof data === 'string') {
          result[out] = new TextEncoder().encode(data)
        } else {
          result[out] = data as Uint8Array
        }
        written.push(out)
      }
      options.onProgress?.({ phase: 'Done', ratio: 1 })
      return result
    } catch (err) {
      if (options.signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
      // After terminate(), reload on next call
      if (!ffmpeg.loaded) {
        this.ffmpeg = null
        this.mode = null
      }
      throw err
    } finally {
      options.signal?.removeEventListener('abort', abortHandler)
      for (const name of written) {
        await ffmpeg.deleteFile(name).catch(() => undefined)
      }
      this.busy = false
    }
  }

  async cancel() {
    if (!this.ffmpeg) return
    try {
      this.ffmpeg.terminate()
    } catch {
      /* ignore */
    }
    this.ffmpeg = null
    this.mode = null
    this.busy = false
  }
}

export const ffmpegRuntime = new FFmpegRuntime()
