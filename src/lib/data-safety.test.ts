import { describe, expect, it } from 'vitest'
import { clearWorkspaceConfirmationText, requireClearWorkspaceConfirmation } from '@/lib/data-safety'

describe('data safety confirmations', () => {
  it('accepts only the exact workspace clear confirmation text', () => {
    expect(requireClearWorkspaceConfirmation(clearWorkspaceConfirmationText)).toBe(clearWorkspaceConfirmationText)
    expect(() => requireClearWorkspaceConfirmation('clear')).toThrow('Type CLEAR WORKSPACE DATA')
    expect(() => requireClearWorkspaceConfirmation(undefined)).toThrow('Type CLEAR WORKSPACE DATA')
  })
})
