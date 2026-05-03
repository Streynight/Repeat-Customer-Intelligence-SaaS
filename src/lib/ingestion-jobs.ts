type MetricRecomputeJobData = {
  workspaceId: string
  provider: 'csv'
  jobType: 'metricRecompute'
  status: 'queued'
  idempotencyKey?: string
}

export type IngestionJobWriter = {
  create(args: { data: MetricRecomputeJobData, select: { id: true } }): Promise<{ id: string }>
  upsert(args: {
    where: { idempotencyKey: string }
    update: Record<string, never>
    create: MetricRecomputeJobData
    select: { id: true }
  }): Promise<{ id: string }>
}

export function metricRecomputeIdempotencyKey(eventId: string | undefined | null) {
  return eventId ? `metrics:${eventId}` : null
}

export async function recordMetricRecomputeJob(
  ingestionJob: IngestionJobWriter,
  input: { workspaceId: string, eventId?: string | null },
) {
  const idempotencyKey = metricRecomputeIdempotencyKey(input.eventId)
  const data: MetricRecomputeJobData = {
    workspaceId: input.workspaceId,
    provider: 'csv',
    jobType: 'metricRecompute',
    status: 'queued',
    ...(idempotencyKey ? { idempotencyKey } : {}),
  }

  if (!idempotencyKey) {
    return ingestionJob.create({
      data,
      select: { id: true },
    })
  }

  return ingestionJob.upsert({
    where: { idempotencyKey },
    update: {},
    create: data,
    select: { id: true },
  })
}
