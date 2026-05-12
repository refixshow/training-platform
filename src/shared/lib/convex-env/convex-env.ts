export function getConfiguredConvexUrl() {
  const value = import.meta.env.VITE_CONVEX_URL?.trim()

  if (!value || !value.startsWith('http')) {
    return undefined
  }

  return value
}

export function hasConfiguredConvexUrl() {
  return Boolean(getConfiguredConvexUrl())
}
