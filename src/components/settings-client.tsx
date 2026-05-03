'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIntelligenceDataset } from '@/lib/use-intelligence-dataset'

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
      <TabsList>
        <TabsTrigger value="rules">Rules</TabsTrigger>
        <TabsTrigger value="workflow">Workflow</TabsTrigger>
      </TabsList>
      <TabsContent value="rules" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Classification rules</CardTitle>
            <CardDescription>Simple MVP rules that keep repeat intelligence easy to explain.</CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle>Automation-ready webhook architecture</CardTitle>
            <CardDescription>Boundaries are ready without building messaging automation yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">Future n8n workflows can subscribe to completed imports, VIP creation, and at-risk customer exports. This MVP keeps those boundaries clean.</p>
            <Button variant="outline" className="mt-5 font-black" disabled={clearing} onClick={() => void clearWorkspace()}>
              {clearing ? 'Clearing...' : 'Clear workspace data'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
