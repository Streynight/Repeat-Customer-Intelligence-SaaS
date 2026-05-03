export const databaseUnavailableMessage =
  'Database is temporarily unavailable. Please refresh in a moment.'

export function isDatabaseConnectionError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : ''
  const message = error instanceof Error ? error.message : String(error)

  return (
    code === 'P1001' ||
    message.includes("Can't reach database server") ||
    message.includes('Timed out fetching a new connection') ||
    message.includes('Database is temporarily unavailable')
  )
}

export function normalizeDatabaseError(error: unknown) {
  if (isDatabaseConnectionError(error)) {
    return new Error(databaseUnavailableMessage)
  }

  return error instanceof Error ? error : new Error(String(error))
}
