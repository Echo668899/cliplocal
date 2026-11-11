/**
 * ClipLocal Worker: SPA assets + R2-backed FFmpeg cores.
 * Paths under /ffmpeg/* are handled here so missing/oversized wasm
 * is not incorrectly served as index.html by SPA fallback.
 */
const ISOLATION = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

function withIsolation(response) {
  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(ISOLATION)) headers.set(k, v)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function serveFfmpeg(env, key) {
  if (!key || key.includes('..')) {
    return withIsolation(new Response('Not found', { status: 404 }))
  }

  if (env.FFMPEG_BUCKET) {
    const object = await env.FFMPEG_BUCKET.get(key)
    if (object) {
      const headers = new Headers()
      object.writeHttpMetadata(headers)
      headers.set('etag', object.httpEtag)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      if (key.endsWith('.wasm')) headers.set('Content-Type', 'application/wasm')
      else if (key.endsWith('.js')) headers.set('Content-Type', 'text/javascript; charset=utf-8')
      for (const [k, v] of Object.entries(ISOLATION)) headers.set(k, v)
      return new Response(object.body, { headers })
    }
  }

  // Fallback to bundled assets (js/worker; wasm usually lives in R2)
  if (env.ASSETS) {
    const assetRes = await env.ASSETS.fetch(new Request(`https://assets.local/ffmpeg/${key}`))
    if (assetRes.ok) return withIsolation(assetRes)
  }

  return withIsolation(
    new Response(
      'FFmpeg core not found. Upload cores to R2 bucket cliplocal-ffmpeg (see README).',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    ),
  )
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/ffmpeg/')) {
      return serveFfmpeg(env, url.pathname.slice('/ffmpeg/'.length))
    }

    if (env.ASSETS) {
      return withIsolation(await env.ASSETS.fetch(request))
    }

    return withIsolation(new Response('Not found', { status: 404 }))
  },
}
