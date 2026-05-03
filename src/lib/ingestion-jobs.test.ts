import { describe, expect, it, vi } from 'vitest'
import { metricRecomputeIdempotencyKey, recordMetricRecomputeJob } from '@/lib/ingestion-jobs'

describe('ingestion job idempotency', () => {
  it('derives stable metric recompute idempotency keys from Inngest event ids', () => {
    expect(metricRecomputeIdempotencyKey('evt_123')).toBe('metrics:evt_123')
    expect(metricRecomputeIdempotencyKey(null)).toBeNull()
  })

  it('upserts metric recompute jobs when an Inngest event id is available', async () => {
    const ingestionJob = {
      create: vi.fn().mockResolvedValue({ id: 'job_created' }),
      upsert: vi.fn().mockResolvedValue({ id: 'job_existing' }),
    }

    const result = await recordMetricRecomputeJob(ingestionJob, {
      workspaceId: 'workspace_123',
      eventId: 'evt_123',
    })

    expect(result.id).toBe('job_existing')
    expect(ingestionJob.create).not.toHaveBeenCalled()
    expect(ingestionJob.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: 'metrics:evt_123' },
      create: expect.objectContaining({
        workspaceId: 'workspace_123',
        jobType: 'metricRecompute',
        idempotencyKey: 'metrics:evt_123',
      }),
    }))
  })

  it('creates a normal job when no event id exists', async () => {
    const ingestionJob = {
      create: vi.fn().mockResolvedValue({ id: 'job_created' }),
      upsert: vi.fn().mockResolvedValue({ id: 'job_existing' }),
    }

    await recordMetricRecomputeJob(ingestionJob, {
      workspaceId: 'workspace_123',
      eventId: null,
    })

    expect(ingestionJob.upsert).not.toHaveBeenCalled()
    expect(ingestionJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ idempotencyKey: expect.any(String) }),
    }))
  })
})
