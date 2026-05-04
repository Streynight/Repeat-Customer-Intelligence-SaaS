export const clearWorkspaceConfirmationText = 'CLEAR WORKSPACE DATA'

export function requireClearWorkspaceConfirmation(value: unknown) {
  if (value !== clearWorkspaceConfirmationText) {
    throw new Error(`Type ${clearWorkspaceConfirmationText} to clear workspace data.`)
  }

  return clearWorkspaceConfirmationText
}
