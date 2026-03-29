'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Banknote, TrendingUp, AlertTriangle, UserCheck, Package } from 'lucide-react'
import { StatsCard } from '@/components/ui/StatsCard'
import { WidgetCard } from '@/components/dashboard/WidgetCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { PipelineBreakdown } from '@/components/dashboard/PipelineBreakdown'
import { UrgentTasks } from '@/components/dashboard/UrgentTasks'
import { UpcomingLeaves } from '@/components/dashboard/UpcomingLeaves'
import { RecentActivity } from '@/components/dashboard/RecentActivity'

const supabase = createClient()

const fmtDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n)

export default function DashboardPage() {
  const now = new Date()
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().split('T')[0]

  // KPI 1: Chiffre d'affaires (paid invoices this month)
  const { data: revenue } = useQuery({
    queryKey: ['dashboard', 'revenue', firstDayOfMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .is('deleted_at', null)
        .gte('issue_date', firstDayOfMonth)
        .lte('issue_date', lastDayOfMonth)
      return data?.reduce((sum, r) => sum + (r.total ?? 0), 0) ?? 0
    },
  })

  // KPI 2: Pipeline actif (total deals value)
  const { data: pipelineTotal } = useQuery({
    queryKey: ['dashboard', 'pipeline-total'],
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('value')
        .is('deleted_at', null)
      return data?.reduce((sum, r) => sum + (r.value ?? 0), 0) ?? 0
    },
  })

  // KPI 3: Factures en retard
  const { data: overdueCount } = useQuery({
    queryKey: ['dashboard', 'overdue'],
    queryFn: async () => {
      const { count } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'overdue')
        .is('deleted_at', null)
      return count ?? 0
    },
  })

  // KPI 4: Employes actifs
  const { data: employeeCount } = useQuery({
    queryKey: ['dashboard', 'employees'],
    queryFn: async () => {
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'terminated')
        .is('deleted_at', null)
      return count ?? 0
    },
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">Système opérationnel</span>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          label="Chiffre d'affaires"
          value={revenue != null ? fmtDZD(revenue) : null}
          icon={Banknote}
          color="green"
          hint="Ce mois-ci"
        />
        <StatsCard
          label="Pipeline actif"
          value={pipelineTotal != null ? fmtDZD(pipelineTotal) : null}
          icon={TrendingUp}
          color="blue"
          hint="Total en cours"
        />
        <StatsCard
          label="Factures en retard"
          value={overdueCount ?? null}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          label="Employes actifs"
          value={employeeCount ?? null}
          icon={UserCheck}
          color="purple"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <WidgetCard title="Tresorerie" linkHref="/dashboard/reports" linkLabel="Rapports" className="lg:col-span-3">
          <RevenueChart />
        </WidgetCard>
        <WidgetCard title="Pipeline de vente" linkHref="/dashboard/deals" linkLabel="Pipeline" className="lg:col-span-2">
          <PipelineBreakdown />
        </WidgetCard>
      </div>

      {/* Row 3: 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <WidgetCard title="Alertes Stock" muted>
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 opacity-60">
            <Package className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">Module a venir</p>
            <p className="text-xs mt-1">Gestion de stock en cours de developpement</p>
          </div>
        </WidgetCard>
        <WidgetCard title="Taches urgentes" linkHref="/dashboard/tasks" linkLabel="Taches">
          <UrgentTasks />
        </WidgetCard>
        <WidgetCard title="Conges a venir" linkHref="/dashboard/leaves" linkLabel="Conges">
          <UpcomingLeaves />
        </WidgetCard>
      </div>

      {/* Row 4: Full width */}
      <WidgetCard title="Activite recente">
        <RecentActivity />
      </WidgetCard>
    </div>
  )
}
