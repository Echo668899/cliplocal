/**
 * Optional R2 proxy for FFmpeg cores when Cloudflare Pages
 * 25 MiB per-file limit blocks direct static hosting of ffmpeg-core.wasm.
 *
 * Bind an R2 bucket named FFMPEG_BUCKET containing:
 *   core/ffmpeg-core.js|wasm
 *   core-mt/ffmpeg-core.js|wasm|worker.js
 */
export async function onRequest(context) {
  const path = context.params.path
  const key = Array.isArray(path) ? path.join('/') : path
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 })
  }

  const bucket = context.env.FFMPEG_BUCKET
  if (!bucket) {
    return new Response('FFMPEG_BUCKET binding not configured', { status: 503 })
  }

  const object = await bucket.get(key)
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  if (key.endsWith('.wasm')) headers.set('Content-Type', 'application/wasm')
  if (key.endsWith('.js')) headers.set('Content-Type', 'text/javascript')

  return new Response(object.body, { headers })
}
