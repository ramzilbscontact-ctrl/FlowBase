'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { WidgetSkeleton } from './WidgetCard'

const supabase = createClient()

const STAGE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#f97316', '#22c55e', '#ef4444']

const fmtDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n)

type StageData = { name: string; count: number; totalValue: number; position: number }

export function PipelineBreakdown() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'pipeline-stages'],
    queryFn: async () => {
      const { data: deals } = await supabase
        .from('deals')
        .select('value, stage_id, pipeline_stages(name, position)')
        .is('deleted_at', null)

      if (!deals) return []

      const byStage: Record<string, StageData> = {}
      for (const d of deals) {
        const stage = d.pipeline_stages as unknown as { name: string; position: number } | null
        if (!stage) continue
        const key = stage.name
        if (!byStage[key]) {
          byStage[key] = { name: stage.name, count: 0, totalValue: 0, position: stage.position }
        }
        byStage[key].count++
        byStage[key].totalValue += d.value ?? 0
      }

      return Object.values(byStage).sort((a, b) => a.position - b.position)
    },
  })

  if (isLoading) return <WidgetSkeleton height={280} />

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
        Aucune opportunite dans le pipeline
      </div>
    )
  }

  const maxValue = Math.max(...data.map(s => s.totalValue), 1)

  return (
    <div className="space-y-3">
      {data.map((stage, i) => (
        <div key={stage.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600">{stage.name}</span>
            <span className="text-xs text-gray-400">{stage.count} deal{stage.count > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((stage.totalValue / maxValue) * 100, 4)}%`,
                  backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length],
                }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600 w-24 text-right shrink-0">
              {fmtDZD(stage.totalValue)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
