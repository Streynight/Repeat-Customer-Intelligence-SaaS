'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Banknote, Download, PlugZap, ReceiptText, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import {
  createCsvSyncConnection,
  deleteCsvSyncConnection,
  loadFinanceWorkspace,
  runCsvSyncNow,
  saveFinanceSettings,
  testCsvSyncConnectionUrl,
  updateCsvSyncConnection,
} from '@/app/actions/finance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreeEmptyState } from '@/components/ui/tree-surfaces'
import { buildChannelIncomeRows, buildIncomeSummary, buildMonthlyIncomeRows, buildVatSummary, defaultFinanceSettings, exportVatSummaryCsv } from '@/lib/services/finance'
import { downloadCsv } from '@/lib/services/export'
import { useIntelligenceDataset } from '@/components/hooks/use-intelligence-dataset'
import { channelLabels, sourceChannels, type CsvSyncConnectionState, type CsvSyncRunResult, type FinanceSettings, type SourceChannel } from '@/lib/types'
import { useText } from '@/lib/i18n'

type IncomeTab = 'overview' | 'vat' | 'channels' | 'sync'

const tabs: IncomeTab[] = ['overview', 'vat', 'channels', 'sync']

export function IncomeClient() {
  const { dataset, loading } = useIntelligenceDataset()
  const t = useText()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedTab = normalizeTab(searchParams.get('tab'))
  const [settings, setSettings] = useState<FinanceSettings>(defaultFinanceSettings)
  const [connections, setConnections] = useState<CsvSyncConnectionState[]>([])
  const [runs, setRuns] = useState<CsvSyncRunResult[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const workspaceEmpty = dataset.customers.length === 0 && dataset.orders.length === 0
  const summary = useMemo(() => buildIncomeSummary(dataset, settings), [dataset, settings])
  const monthlyRows = useMemo(() => buildMonthlyIncomeRows(dataset, settings), [dataset, settings])
  const vatRows = useMemo(() => buildVatSummary(dataset, settings), [dataset, settings])
  const channelRows = useMemo(() => buildChannelIncomeRows(dataset, settings), [dataset, settings])

  useEffect(() => {
    let alive = true

    loadFinanceWorkspace()
      .then((workspace) => {
        if (!alive) return
        setSettings(workspace.settings)
        setConnections(workspace.connections)
        setRuns(workspace.runs)
      })
      .catch((error) => {
        console.error('Failed to load finance workspace. Falling back to defaults.', error)
        if (!alive) return
        setSettings(defaultFinanceSettings)
        setConnections([])
        setRuns([])
      })
      .finally(() => {
        if (alive) setWorkspaceLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  if (loading || workspaceLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Loading income workspace')}</CardTitle>
          <CardDescription>{t('Preparing revenue, VAT, and CSV sync settings.')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (workspaceEmpty && selectedTab !== 'sync') {
    return <EmptyIncome />
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={t('Gross income')} value={baht(summary.grossIncome)} tone="income" href="/income" />
        <MetricCard label={t('Net snapshot')} value={baht(summary.netIncome)} tone="repeat" href="/income?tab=vat" />
        <MetricCard label={`${settings.taxLabel} ${t('estimate')}`} value={baht(summary.taxAmount)} tone="vip" href="/income?tab=vat" />
        <MetricCard label={t('Platform fees')} value={baht(summary.platformFeeAmount)} tone="risk" href="/income?tab=channels" />
        <MetricCard label={t('Refunds')} value={baht(summary.refundAmount)} tone="risk" href="/income?tab=vat" />
      </section>

      <Tabs
        value={selectedTab}
        onValueChange={(value) => router.push(value === 'overview' ? '/income' : `/income?tab=${value}`)}
      >
        <TabsList className="w-full justify-start overflow-x-auto bg-secondary/55 p-1">
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="vat">{t('VAT')}</TabsTrigger>
          <TabsTrigger value="channels">{t('Channels')}</TabsTrigger>
          <TabsTrigger value="sync">{t('Sync')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab summary={summary} monthlyRows={monthlyRows} settings={settings} />
        </TabsContent>
        <TabsContent value="vat" className="space-y-6">
          <VatTab settings={settings} setSettings={setSettings} rows={vatRows} />
        </TabsContent>
        <TabsContent value="channels" className="space-y-6">
          <ChannelsTab rows={channelRows} />
        </TabsContent>
        <TabsContent value="sync" className="space-y-6">
          <SyncTab connections={connections} runs={runs} setConnections={setConnections} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyIncome() {
  const t = useText()

  return (
    <TreeEmptyState
      title={t('Income appears after the first import')}
      description={t('Import or schedule a CSV sync to unlock gross income, net snapshot, Thailand VAT estimates, channel income, and monthly exports.')}
      tone="income"
      action={{ href: '/imports', label: t('Import orders'), icon: <UploadCloud size={16} /> }}
      secondaryAction={{ href: '/income?tab=sync', label: t('Add CSV sync'), icon: <PlugZap size={16} /> }}
    />
  )
}

function OverviewTab({
  summary,
  monthlyRows,
  settings,
}: {
  summary: ReturnType<typeof buildIncomeSummary>
  monthlyRows: ReturnType<typeof buildMonthlyIncomeRows>
  settings: FinanceSettings
}) {
  const t = useText()

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="size-5 text-primary" />
            {t('Monthly income')}
          </CardTitle>
          <CardDescription>{t('Gross income and net snapshot after estimated')} {settings.taxLabel}, {t('fees, and refunds.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Month')}</TableHead>
                <TableHead>{t('Gross')}</TableHead>
                <TableHead>{settings.taxLabel}</TableHead>
                <TableHead>{t('Fees')}</TableHead>
                <TableHead>{t('Refunds')}</TableHead>
                <TableHead>{t('Net snapshot')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyRows.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-bold">{row.month}</TableCell>
                  <TableCell>{baht(row.grossIncome)}</TableCell>
                  <TableCell>{baht(row.taxAmount)}</TableCell>
                  <TableCell>{baht(row.platformFeeAmount)}</TableCell>
                  <TableCell>{baht(row.refundAmount)}</TableCell>
                  <TableCell>{baht(row.netIncome)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Income mix')}</CardTitle>
          <CardDescription>{t('Snapshot for decision-making, not tax filing automation.')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <BreakdownRow label="Gross income" value={summary.grossIncome} />
          <BreakdownRow label={settings.taxLabel} value={summary.taxAmount} tone="vip" />
          <BreakdownRow label="Shipping collected" value={summary.shippingAmount} />
          <BreakdownRow label="Discounts" value={summary.discountAmount} />
          <BreakdownRow label="Platform fees" value={summary.platformFeeAmount} tone="risk" />
          <BreakdownRow label="Refunds" value={summary.refundAmount} tone="risk" />
          <BreakdownRow label="Net snapshot" value={summary.netIncome} tone="repeat" />
        </CardContent>
      </Card>
    </div>
  )
}

function VatTab({
  settings,
  setSettings,
  rows,
}: {
  settings: FinanceSettings
  setSettings: (settings: FinanceSettings) => void
  rows: ReturnType<typeof buildVatSummary>
}) {
  const t = useText()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const submitSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextSettings = {
      taxCountry: String(formData.get('taxCountry') ?? 'TH'),
      taxLabel: String(formData.get('taxLabel') ?? 'VAT'),
      taxRate: Number(formData.get('taxRatePercent')) / 100,
      taxIncluded: formData.get('taxIncluded') === 'true',
    }

    setSaving(true)
    setMessage('')
    try {
      await saveFinanceSettings(nextSettings)
      setSettings(nextSettings)
      setMessage('Saved VAT settings.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save VAT settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t('Thailand VAT settings')}</CardTitle>
          <CardDescription>{t('Default estimate is VAT-inclusive 7% for Thailand-style merchant exports.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={(event) => void submitSettings(event)}>
            <Input name="taxCountry" defaultValue={settings.taxCountry} aria-label={t('Tax country')} />
            <Input name="taxLabel" defaultValue={settings.taxLabel} aria-label={t('Tax label')} />
            <Input name="taxRatePercent" type="number" step="0.01" defaultValue={settings.taxRate * 100} aria-label={t('Tax rate percent')} />
            <select
              name="taxIncluded"
              defaultValue={String(settings.taxIncluded)}
              aria-label={t('Tax included')}
              className="h-8 rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="true">{t('Tax included in order total')}</option>
              <option value="false">{t('Tax added on top')}</option>
            </select>
            <Button type="submit" disabled={saving}>{saving ? t('Saving...') : t('Save VAT settings')}</Button>
          </form>
          {message ? <p className="mt-3 text-sm font-semibold text-primary">{t(message)}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="size-5 text-primary" />
              {t('Monthly VAT summary')}
            </CardTitle>
            <CardDescription>{t('Explicit tax columns override estimates; missing tax columns use the configured estimate.')}</CardDescription>
          </div>
          <Button variant="outline" onClick={() => downloadCsv('vat-summary.csv', exportVatSummaryCsv(rows, settings.taxLabel))}>
            <Download size={15} />
            {t('Export VAT CSV')}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Month')}</TableHead>
                <TableHead>{t('Gross')}</TableHead>
                <TableHead>{t('Explicit')}</TableHead>
                <TableHead>{t('Estimated')}</TableHead>
                <TableHead>{t('Total')} {settings.taxLabel}</TableHead>
                <TableHead>{t('Net before')} {settings.taxLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-bold">{row.month}</TableCell>
                  <TableCell>{baht(row.grossIncome)}</TableCell>
                  <TableCell>{baht(row.explicitVat)}</TableCell>
                  <TableCell>{baht(row.estimatedVat)}</TableCell>
                  <TableCell>{baht(row.totalVat)}</TableCell>
                  <TableCell>{baht(row.netBeforeVat)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ChannelsTab({ rows }: { rows: ReturnType<typeof buildChannelIncomeRows> }) {
  const t = useText()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Channel income')}</CardTitle>
        <CardDescription>{t('Gross and net snapshot by first imported order source.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Channel')}</TableHead>
              <TableHead>{t('Orders')}</TableHead>
              <TableHead>{t('Gross')}</TableHead>
              <TableHead>{t('Tax')}</TableHead>
              <TableHead>{t('Fees')}</TableHead>
              <TableHead>{t('Refunds')}</TableHead>
              <TableHead>{t('Net')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.channel}>
                <TableCell className="font-bold">{t(channelLabels[row.channel])}</TableCell>
                <TableCell>{row.orderCount}</TableCell>
                <TableCell>{baht(row.grossIncome)}</TableCell>
                <TableCell>{baht(row.taxAmount)}</TableCell>
                <TableCell>{baht(row.platformFeeAmount)}</TableCell>
                <TableCell>{baht(row.refundAmount)}</TableCell>
                <TableCell>{baht(row.netIncome)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function SyncTab({
  connections,
  runs,
  setConnections,
}: {
  connections: CsvSyncConnectionState[]
  runs: CsvSyncRunResult[]
  setConnections: (connections: CsvSyncConnectionState[]) => void
}) {
  const t = useText()
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const submitConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const input = {
      name: String(formData.get('name') ?? ''),
      csvUrl: String(formData.get('csvUrl') ?? ''),
      sourceChannel: String(formData.get('sourceChannel') ?? 'csv') as SourceChannel,
    }

    setSaving(true)
    setMessage('')
    try {
      const test = await testCsvSyncConnectionUrl(input)
      const connection = await createCsvSyncConnection(input)
      setConnections([connection, ...connections])
      setMessage(`Connected ${test.importableRows} importable rows. Cron will sync hourly.`)
      form.reset()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect CSV URL.')
    } finally {
      setSaving(false)
    }
  }

  const runNow = async (id: string) => {
    setMessage('Running sync...')
    const result = await runCsvSyncNow(id)
    setMessage(`Sync ${result.status}: ${result.importedRows}/${result.totalRows} new rows imported.`)
    window.location.reload()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="size-5 text-primary" />
            {t('CSV scheduled sync')}
          </CardTitle>
          <CardDescription>{t('Connect an HTTPS CSV export URL. Vercel Cron calls `/api/sync/csv` hourly.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={(event) => void submitConnection(event)}>
            <Input name="name" placeholder={t('Connection name')} aria-label={t('Connection name')} />
            <Input name="csvUrl" placeholder="https://..." aria-label={t('CSV URL')} />
            <select
              name="sourceChannel"
              defaultValue="shopee"
              aria-label={t('Source channel')}
              className="h-8 rounded-lg border border-input bg-card px-3 text-sm"
            >
              {sourceChannels.map((channel) => (
                <option key={channel} value={channel}>{t(channelLabels[channel])}</option>
              ))}
            </select>
            <Button disabled={saving} type="submit">{saving ? t('Testing...') : t('Test and save sync')}</Button>
          </form>
          <p className="mt-3 rounded-lg bg-secondary/45 p-3 text-xs leading-5 text-muted-foreground">
            {t('Uses the same default CSV headers as manual import, including optional tax_amount, platform_fee_amount, refund_amount, discount_amount, and shipping_amount.')}
          </p>
          {message ? <p className="mt-3 text-sm font-semibold text-primary">{formatSyncMessage(message, t)}</p> : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('Connections')}</CardTitle>
            <CardDescription>{t('Enabled connections run on cron and can be synced manually.')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {connections.length > 0 ? connections.map((connection) => (
              <div key={connection.id} className="rounded-lg border border-border bg-secondary/25 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{connection.name}</h3>
                      <Badge variant={connection.enabled ? 'secondary' : 'outline'}>{connection.enabled ? t('Enabled') : t('Paused')}</Badge>
                      {connection.lastSyncStatus ? <Badge variant={connection.lastSyncStatus === 'failed' ? 'destructive' : 'outline'}>{t(connection.lastSyncStatus)}</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{t(channelLabels[connection.sourceChannel])} - {t('every')} {connection.intervalMinutes} {t('minutes')}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{connection.csvUrl}</p>
                    {connection.lastSyncError ? <p className="mt-2 text-xs font-semibold text-red-700">{connection.lastSyncError}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void runNow(connection.id)}>
                      <RefreshCw size={14} />
                      {t('Sync now')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const updated = await updateCsvSyncConnection({ id: connection.id, enabled: !connection.enabled })
                        setConnections(connections.map((item) => item.id === updated.id ? updated : item))
                      }}
                    >
                      {connection.enabled ? t('Pause') : t('Enable')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${t('Delete')} ${connection.name}`}
                      onClick={async () => {
                        await deleteCsvSyncConnection(connection.id)
                        setConnections(connections.filter((item) => item.id !== connection.id))
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">{t('No CSV sync connections yet.')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Recent sync runs')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {runs.length > 0 ? runs.map((run) => (
              <div key={`${run.connectionId}-${run.startedAt}`} className="rounded-lg border border-border bg-card p-3">
                <div>
                  <p className="font-bold capitalize">{t(run.status)}</p>
                  <p className="text-xs text-muted-foreground">{run.importedRows}/{run.totalRows} {t('imported')}</p>
                </div>
              </div>
            )) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">{t('No sync runs yet.')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BreakdownRow({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'repeat' | 'vip' | 'risk' }) {
  const t = useText()
  const toneClass = {
    neutral: 'bg-card text-foreground',
    repeat: 'bg-emerald-50 text-emerald-900',
    vip: 'bg-violet-50 text-violet-900',
    risk: 'bg-rose-50 text-rose-900',
  }[tone]

  return (
    <div className={`flex items-center justify-between rounded-lg border border-border px-3 py-2 ${toneClass}`}>
      <span className="text-sm font-semibold">{t(label)}</span>
      <strong>{baht(value)}</strong>
    </div>
  )
}

function normalizeTab(tab: string | null): IncomeTab {
  return tabs.includes(tab as IncomeTab) ? tab as IncomeTab : 'overview'
}

function baht(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatSyncMessage(message: string, t: (text: string) => string) {
  const connectedMatch = /^Connected (\d+) importable rows\. Cron will sync hourly\.$/.exec(message)
  if (connectedMatch) return `${t('Connected')} ${connectedMatch[1]} ${t('importable rows. Cron will sync hourly.')}`

  const syncMatch = /^Sync (\w+): (\d+)\/(\d+) new rows imported\.$/.exec(message)
  if (syncMatch) return `${t('Sync')} ${t(syncMatch[1])}: ${syncMatch[2]}/${syncMatch[3]} ${t('new rows imported.')}`

  return t(message)
}
