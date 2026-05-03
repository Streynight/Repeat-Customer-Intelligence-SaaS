'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TreeSprout } from '@/components/ui/tree-surfaces'
import { useIntelligenceDataset } from '@/components/hooks/use-intelligence-dataset'

export function SettingsClient() {
  const { dataset, updateVipThreshold, clearDataset } = useIntelligenceDataset()
  const [clearing, setClearing] = useState(false)

  const clearWorkspace = async () => {
    if (!window.confirm('Clear all customers, orders, and import history from this workspace?')) return

    setClearing(true)
    try {
      await clearDataset()
    } finally {
      setClearing(false)
    }
  }

  return (
    <Tabs defaultValue="rules" className="w-full">
      <TabsList className="bg-secondary/55">
        <TabsTrigger value="rules">Rules</TabsTrigger>
        <TabsTrigger value="workflow">Workflow</TabsTrigger>
      </TabsList>
      <TabsContent value="rules" className="mt-4">
        <Card className="border-primary/10 bg-card">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <TreeSprout className="size-9 rounded-lg" />
            <div>
              <CardTitle>Classification rules</CardTitle>
              <CardDescription>Operational rules used by retention scoring, segmentation, and lifecycle automation.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">New: 1 order. Repeat: 2+ orders. VIP: 3+ orders and spend above threshold. At Risk: no purchase in 30 days. Lost: no purchase in 90 days.</p>
            <Separator className="my-5" />
            <div className="grid max-w-sm gap-2">
              <Label htmlFor="vip-threshold">VIP spend threshold</Label>
              <Input id="vip-threshold" type="number" value={dataset.vipThreshold} onChange={(event) => updateVipThreshold(Number(event.target.value))} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="workflow" className="mt-4">
        <Card className="border-primary/10 bg-card">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <TreeSprout className="size-9 rounded-lg" />
            <div>
              <CardTitle>Automation-ready webhook architecture</CardTitle>
              <CardDescription>Lifecycle triggers are backed by jobs, audit logs, and tenant permissions.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">Automation events support churn alerts, VIP detection, repeat reminders, win-back triggers, and revenue anomaly workflows.</p>
            <Button variant="outline" className="mt-5 font-black" disabled={clearing} onClick={() => void clearWorkspace()}>
              {clearing ? 'Clearing...' : 'Clear workspace data'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
