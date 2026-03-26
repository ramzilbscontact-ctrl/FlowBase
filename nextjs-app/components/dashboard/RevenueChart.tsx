'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { WidgetSkeleton } from './WidgetCard'

const supabase = createClient()

const MONTH_FR = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

const fmtDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n)

export function RevenueChart() {
  const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
    .toISOString().split('T')[0]

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'revenue-chart'],
    queryFn: async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, issue_date')
        .eq('status', 'paid')
        .is('deleted_at', null)
        .gte('issue_date', sixMonthsAgo)

      if (!invoices) return []

      // Group by month
      const byMonth: Record<string, number> = {}
      for (const inv of invoices) {
        const d = new Date(inv.issue_date)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        byMonth[key] = (byMonth[key] ?? 0) + (inv.total ?? 0)
      }

      // Build last 6 months array
      const now = new Date()
      const result = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        result.push({
          month: MONTH_FR[d.getMonth()],
          revenue: byMonth[key] ?? 0,
        })
      }
      return result
    },
  })

  if (isLoading) return <WidgetSkeleton height={280} />

  const hasData = data && data.some(d => d.revenue > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
        Aucune facture payee sur les 6 derniers mois
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value: number) => [fmtDZD(value), 'Revenu']} labelStyle={{ color: '#475569' }} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
