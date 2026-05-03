import { describe, expect, it, vi } from 'vitest'
import {
  lifecycleAutomationIdempotencyKey,
  normalizeAutomationType,
  recordLifecycleAutomationEvent,
} from '@/lib/automation-events'

describe('automation event idempotency', () => {
  it('derives stable lifecycle automation idempotency keys from Inngest event ids', () => {
    expect(lifecycleAutomationIdempotencyKey('evt_123')).toBe('automation:evt_123')
    expect(lifecycleAutomationIdempotencyKey(null)).toBeNull()
  })

  it('normalizes unsupported automation types to the safest alert type', () => {
    expect(normalizeAutomationType('winBack')).toBe('winBack')
    expect(normalizeAutomationType('unsupported')).toBe('churnAlert')
  })

  it('upserts automation events when an event id is available', async () => {
    const automationEvent = {
      create: vi.fn().mockResolvedValue({ id: 'event_created' }),
      upsert: vi.fn().mockResolvedValue({ id: 'event_existing' }),
    }

    const result = await recordLifecycleAutomationEvent(automationEvent, {
      workspaceId: 'workspace_123',
      eventId: 'evt_123',
      type: 'vipDetected',
      payload: { customerProfileId: 'customer_123' },
    })

    expect(result.id).toBe('event_existing')
    expect(automationEvent.create).not.toHaveBeenCalled()
    expect(automationEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: 'automation:evt_123' },
      create: expect.objectContaining({
        workspaceId: 'workspace_123',
        type: 'vipDetected',
        idempotencyKey: 'automation:evt_123',
        payload: {
          customerProfileId: 'customer_123',
          inngestEventId: 'evt_123',
        },
      }),
    }))
  })

  it('creates a normal automation event when no event id exists', async () => {
    const automationEvent = {
      create: vi.fn().mockResolvedValue({ id: 'event_created' }),
      upsert: vi.fn().mockResolvedValue({ id: 'event_existing' }),
    }

    await recordLifecycleAutomationEvent(automationEvent, {
      workspaceId: 'workspace_123',
      eventId: null,
      type: 'winBack',
      payload: { customerProfileId: 'customer_123' },
    })

    expect(automationEvent.upsert).not.toHaveBeenCalled()
    expect(automationEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ idempotencyKey: expect.any(String) }),
    }))
  })
})
