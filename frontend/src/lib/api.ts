const DEFAULT_API_BASE_URL = 'http://localhost:8000'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL

function resolvedApiBaseUrl() {
  const configured = API_BASE_URL.trim() || DEFAULT_API_BASE_URL

  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return new URL(configured, window.location.origin).toString().replace(/\/$/, '')
  }

  return DEFAULT_API_BASE_URL
}

export function backendApiUrl(path: string, params?: Record<string, string>) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${resolvedApiBaseUrl()}${normalizedPath}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return url.toString()
}
