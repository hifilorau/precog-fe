'use client'

// Lightweight wrapper around fetch with sensible defaults for dynamic data
// - Disables caching to avoid stale responses
// - Merges user options without overriding explicit values

export function apiFetch(input, init = {}) {
  const defaultInit = {
    cache: 'no-store',
  }

  // Merge headers if provided on both sides
  const mergedHeaders = {
    ...(defaultInit.headers || {}),
    ...(init.headers || {}),
  }

  const finalInit = {
    ...defaultInit,
    ...init,
    headers: mergedHeaders,
  }

  return fetch(input, finalInit)
}

export default apiFetch

