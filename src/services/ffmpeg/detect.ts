export function canUseMultiThread(): boolean {
  try {
    return (
      typeof SharedArrayBuffer !== 'undefined' &&
      typeof crossOriginIsolated !== 'undefined' &&
      crossOriginIsolated === true
    )
  } catch {
    return false
  }
}

export type CoreMode = 'mt' | 'st'

export function preferredCoreMode(): CoreMode {
  return canUseMultiThread() ? 'mt' : 'st'
}
