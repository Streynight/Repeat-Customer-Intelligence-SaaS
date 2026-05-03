'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, GitMerge, PlayCircle, UploadCloud } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TreeSprout } from '@/components/ui/tree-surfaces'
import {
  analyzeImportRows,
  defaultMapping,
  parseCsv,
  rowsToOrders,
  type ColumnMapping,
  type ImportDiagnostics,
} from '@/lib/services/import-pipeline'
import { downloadSampleCsv, sampleCsvTemplates, type SampleCsvTemplate } from '@/lib/sample-csv'
import { useIntelligenceDataset } from '@/components/hooks/use-intelligence-dataset'
import { channelLabels, sourceChannels, type SourceChannel } from '@/lib/types'

export function ImportClient() {
  const { dataset, importOrders, loading } = useIntelligenceDataset()
  const [fileName, setFileName] = useState('')
  const [sourceChannel, setSourceChannel] = useState<SourceChannel>('shopee')
  const [fields, setFields] = useState<string[]>([])
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [mapping, setMapping] = useState<ColumnMapping>(defaultMapping)
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState('Waiting for CSV')
  const diagnostics = useMemo<ImportDiagnostics | null>(
    () => rows.length > 0 ? analyzeImportRows(rows, sourceChannel, mapping, dataset) : null,
    [dataset, mapping, rows, sourceChannel],
  )
  const previewOrders = useMemo(() => rowsToOrders(rows, sourceChannel, mapping).slice(0, 8), [mapping, rows, sourceChannel])

  const readFile = async (file: File) => {
    setFileName(file.name)
    setStatus('Parsing CSV')
    const text = await file.text()
    const parsed = parseCsv(text)
    setFields(parsed.fields)
    setRows(parsed.rows)
    setErrors(parsed.errors)
    setStatus(parsed.errors.length ? 'Needs mapping review' : 'Ready to preview')
  }

  const trySample = (template: SampleCsvTemplate) => {
    const parsed = parseCsv(template.csv)
    setFileName(template.fileName)
    setSourceChannel(template.id === 'custom' ? 'csv' : template.id)
    setMapping(defaultMapping)
    setFields(parsed.fields)
    setRows(parsed.rows)
    setErrors(parsed.errors)
    setStatus(`Loaded ${template.label}. Review the preview, then confirm import.`)
  }

  const confirmImport = async () => {
    if (!diagnostics?.canImport) {
      setStatus('Import blocked. Fix required mappings or provide at least one valid row.')
      return
    }

    const orders = rowsToOrders(rows, sourceChannel, mapping)
    setStatus(`Saving ${orders.length} rows…`)
    await importOrders(orders, fileName || 'orders.csv', sourceChannel)
    setStatus(`Imported ${orders.length} rows`)
    setRows([])
    setFields([])
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card className="border-primary/15 bg-gradient-to-br from-card via-secondary/40 to-accent/25">
          <label
            className="tree-tactile flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/20 bg-card/70 p-8 text-center hover:border-primary/35 hover:bg-card hover:shadow-md focus-within:ring-3 focus-within:ring-ring/45"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files[0]
              if (file) void readFile(file)
            }}
          >
            <input
              className="sr-only"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])}
            />
            <TreeSprout className="size-12" />
            <h2 className="mt-4 text-xl font-black">Plant your order CSV here</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Drop one real shop export and RepeatTree grows profiles, repeat paths, income, and calendar timing from it.</p>
            <span className="mt-5 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-bold text-primary-foreground">
              <UploadCloud size={15} />
              Choose CSV
            </span>
          </label>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Try sample CSVs</CardTitle>
              <CardDescription className="mt-1 max-w-2xl leading-6">
                Use these merchant-style files only for local validation before connecting native commerce integrations.
              </CardDescription>
            </div>
            <Badge variant="secondary">Fallback import</Badge>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-3">
            {sampleCsvTemplates.map((template) => (
              <article key={template.id} className="rounded-xl border border-primary/10 bg-gradient-to-br from-card to-secondary/35 p-4 shadow-sm shadow-stone-200/50">
                <h3 className="font-black">{template.label}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{template.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => trySample(template)}>
                    <PlayCircle size={15} />
                    Try sample
                  </Button>
                  <Button variant="outline" onClick={() => downloadSampleCsv(template)}>
                    <Download size={15} />
                    Download
                  </Button>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>

        {fields.length > 0 && (
          <Card>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black">Column mapping</h2>
                <p className="text-sm text-muted-foreground">Map your CSV columns before confirming import. Required: order ID, customer name, order date, and total amount.</p>
              </div>
              <Select value={sourceChannel} onValueChange={(value) => setSourceChannel(value as SourceChannel)}>
                <SelectTrigger aria-label="Source channel" className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceChannels.map((channel) => (
                    <SelectItem key={channel} value={channel}>{channelLabels[channel]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(Object.keys(mapping) as Array<keyof ColumnMapping>).map((key) => (
                <Label key={key} className="grid gap-1 text-sm font-semibold text-foreground">
                  {key}
                  <select className="h-8 rounded-lg border border-input bg-card px-3 font-normal focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40" value={mapping[key]} onChange={(event) => setMapping({ ...mapping, [key]: event.target.value })}>
                    <option value="">Not mapped</option>
                    {fields.map((field) => <option key={field}>{field}</option>)}
                  </select>
                </Label>
              ))}
            </div>
            <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-950">
              <AlertTriangle size={16} />
              <AlertTitle>Friendly matching reminder</AlertTitle>
              <AlertDescription>Phone or email repeats across channels merge into one profile. If both are missing, fuzzy name matching is used as a weaker fallback.</AlertDescription>
            </Alert>
          </Card>
        )}

        {diagnostics && (
          <ImportDiagnosticsPanel diagnostics={diagnostics} />
        )}

        {diagnostics && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Import preview</h2>
                <p className="text-sm text-muted-foreground">Showing the first valid rows that will be imported.</p>
              </div>
              <Button
                disabled={!diagnostics?.canImport}
                onClick={() => void confirmImport()}
              >
                Confirm import
              </Button>
            </div>
            <Table>
                <TableHeader>
                  <TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Tax</TableHead><TableHead>Fees</TableHead><TableHead>Refund</TableHead><TableHead>Channel</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {previewOrders.length > 0 ? (
                    previewOrders.map((order) => (
                      <TableRow key={order.externalOrderId}>
                        <TableCell className="font-semibold">{order.externalOrderId}</TableCell>
                        <TableCell>{order.customerNameRaw}</TableCell>
                        <TableCell>{order.phoneRaw}</TableCell>
                        <TableCell>{order.orderDate.slice(0, 10)}</TableCell>
                        <TableCell>{order.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>{order.taxAmount?.toLocaleString() ?? '-'}</TableCell>
                        <TableCell>{order.platformFeeAmount?.toLocaleString() ?? '-'}</TableCell>
                        <TableCell>{order.refundAmount?.toLocaleString() ?? '-'}</TableCell>
                        <TableCell>{channelLabels[order.sourceChannel]}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="py-4 text-muted-foreground" colSpan={9}>
                        No valid rows to preview yet. Fix required mappings or row errors.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card className="border-primary/10 bg-gradient-to-br from-card to-secondary/30">
          <h2 className="font-black">Real data readiness</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              Best test file: 20-50 orders with repeat buyers, phone or email columns, order dates,
              total amounts, and product names.
            </p>
            <p>
              Supported source labels: Shopee, TikTok Shop, Instagram, Facebook, Website, and Custom CSV.
            </p>
            <p className="rounded-lg bg-primary/10 p-3 text-primary">
              Privacy note: imported order data is saved to your Supabase Postgres database and
              persists across sessions. New accounts stay empty until you import or intentionally try a sample CSV.
            </p>
          </div>
        </Card>

        <Card className="border-primary/10 bg-gradient-to-br from-card to-accent/15">
          <h2 className="font-black">Import status</h2>
          <p className="mt-2 text-sm text-muted-foreground">{status}</p>
          <div className="mt-4 rounded-lg bg-secondary/45 p-3 text-xs leading-5 text-muted-foreground">
            Good CSV headers: <strong>order_id</strong>, <strong>customer_name</strong>, <strong>phone</strong>, <strong>email</strong>, <strong>order_date</strong>, <strong>total_amount</strong>, <strong>product_name</strong>, <strong>tax_amount</strong>, <strong>platform_fee_amount</strong>, <strong>refund_amount</strong>.
          </div>
          {errors.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-red-700">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        </Card>
        <Card className="border-primary/10 bg-gradient-to-br from-card to-secondary/25">
          <h2 className="font-black">Import history</h2>
          <div className="mt-4 grid gap-3">
            {loading ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                Loading import history.
              </p>
            ) : dataset.imports.length > 0 ? (
              dataset.imports.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-secondary/25 p-3">
                  <p className="text-sm font-bold">{item.fileName}</p>
                  <p className="text-xs text-muted-foreground">{channelLabels[item.sourceChannel]} - {item.importedRows}/{item.totalRows} rows</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                No imports yet. Connect a native integration or upload a fallback CSV.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ImportDiagnosticsPanel({ diagnostics }: { diagnostics: ImportDiagnostics }) {
  const topIssues = diagnostics.issues.slice(0, 5)
  const warningCount = diagnostics.issues.filter((issue) => issue.severity === 'warning').length
  const errorCount = diagnostics.issues.filter((issue) => issue.severity === 'error').length

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-black">Pre-import diagnostics</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Nothing is saved yet. Review row quality and likely merges before confirming import.
          </p>
        </div>
        <Badge variant={diagnostics.canImport ? 'secondary' : 'destructive'} className="gap-2">
          {diagnostics.canImport ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {diagnostics.canImport ? 'Importable' : 'Blocked'}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <DiagnosticStat label="Total rows" value={diagnostics.totalRows} />
        <DiagnosticStat label="Valid rows" value={diagnostics.validRows} tone="good" />
        <DiagnosticStat label="Skipped rows" value={diagnostics.invalidRows} tone={diagnostics.invalidRows ? 'bad' : 'neutral'} />
        <DiagnosticStat label="Warnings" value={warningCount} tone={warningCount ? 'warn' : 'neutral'} />
        <DiagnosticStat label="Errors" value={errorCount} tone={errorCount ? 'bad' : 'neutral'} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DiagnosticStat label="Missing mappings" value={diagnostics.missingRequiredMappings.length} tone={diagnostics.missingRequiredMappings.length ? 'bad' : 'neutral'} />
        <DiagnosticStat label="Bad dates" value={diagnostics.badDates} tone={diagnostics.badDates ? 'bad' : 'neutral'} />
        <DiagnosticStat label="Bad amounts" value={diagnostics.badAmounts} tone={diagnostics.badAmounts ? 'bad' : 'neutral'} />
        <DiagnosticStat label="No phone/email" value={diagnostics.missingContactRows} tone={diagnostics.missingContactRows ? 'warn' : 'neutral'} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/35 p-4">
          <div className="flex items-center gap-2">
            <GitMerge size={17} className="text-primary" />
            <h3 className="font-black">Likely merges</h3>
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <MergeCount label="Phone exact" value={diagnostics.likelyMergeCounts.phone} />
            <MergeCount label="Email exact" value={diagnostics.likelyMergeCounts.email} />
            <MergeCount label="LINE ID exact" value={diagnostics.likelyMergeCounts.lineId} />
            <MergeCount label="Fuzzy name" value={diagnostics.likelyMergeCounts.fuzzyName} />
          </div>
          {diagnostics.likelyMerges.length > 0 && (
            <div className="mt-4 space-y-2">
              {diagnostics.likelyMerges.slice(0, 5).map((merge) => (
                <div key={`${merge.rowNumber}-${merge.customerName}-${merge.strategy}`} className="rounded-lg bg-card p-3 text-xs leading-5 text-muted-foreground">
                  Row {merge.rowNumber}: <strong>{merge.customerName}</strong> may merge with <strong>{merge.matchedCustomer}</strong> via {merge.strategy}.
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-secondary/35 p-4">
          <h3 className="font-black">First row issues</h3>
          {topIssues.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {topIssues.map((issue) => (
                <li key={`${issue.rowNumber}-${issue.message}`} className={issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'}>
                  {issue.rowNumber ? `Row ${issue.rowNumber}: ` : ''}{issue.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No row issues found in the current mapping.</p>
          )}
        </div>
      </div>
    </Card>
  )
}

function DiagnosticStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}) {
  const toneClass = {
    neutral: 'text-foreground bg-card',
    good: 'text-accent-foreground bg-accent/55',
    warn: 'text-amber-700 bg-amber-50',
    bad: 'text-red-700 bg-red-50',
  }[tone]

  return (
    <div className={`rounded-xl border border-border p-3 ${toneClass}`}>
      <p className="text-xs font-black uppercase opacity-70">{label}</p>
      <strong className="mt-2 block text-2xl">{value}</strong>
    </div>
  )
}

function MergeCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
