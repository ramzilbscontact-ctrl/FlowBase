'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/ui/StatsCard'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Users, Building2, TrendingUp, Activity, BarChart3 } from 'lucide-react'

const supabase = createClient()

export default function AnalyticsPage() {
  // KPI counts
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['analytics-kpis'],
    queryFn: async () => {
      const [contacts, companies, deals, dealValues] = await Promise.all([
        supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null),
        supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null),
        supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null),
        supabase.from('deals').select('value').is('deleted_at', null),
      ])
      const pipelineValue =
        dealValues.data?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0
      return {
        totalContacts: contacts.count ?? 0,
        totalCompanies: companies.count ?? 0,
        openDeals: deals.count ?? 0,
        pipelineValue,
      }
    },
  })

  // Deals by stage (for bar chart)
  const { data: dealsByStage } = useQuery({
    queryKey: ['analytics-deals-by-stage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('stage_id, value, pipeline_stages(name, position)')
        .is('deleted_at', null)
      if (error) throw error

      const grouped: Record<string, number> = {}
      for (const deal of data ?? []) {
        const name =
          (deal.pipeline_stages as { name: string } | null)?.name ??
          'Sans étape'
        grouped[name] = (grouped[name] ?? 0) + 1
      }
      return Object.entries(grouped).map(([stage, count]) => ({ stage, count }))
    },
  })

  // Audit log (last 20 entries)
  const { data: auditLog } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, resource, resource_id, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Vue d&apos;ensemble de l&apos;activité</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading ? (
          <>
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          </>
        ) : (
          <>
            <StatsCard
              label="Contacts"
              value={kpis?.totalContacts}
              icon={Users}
              color="violet"
            />
            <StatsCard
              label="Entreprises"
              value={kpis?.totalCompanies}
              icon={Building2}
              color="blue"
            />
            <StatsCard
              label="Opportunités"
              value={kpis?.openDeals}
              icon={TrendingUp}
              color="green"
            />
            <StatsCard
              label="Valeur pipeline"
              value={
                kpis
                  ? new Intl.NumberFormat('fr-DZ', {
                      style: 'currency',
                      currency: 'DZD',
                      maximumFractionDigits: 0,
                    }).format(kpis.pipelineValue)
                  : '—'
              }
              icon={BarChart3}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Charts + Audit Log row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by stage chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Opportunités par étape
          </h3>
          {dealsByStage && dealsByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={dealsByStage}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="Deals"
                  fill="#7c3aed"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Audit log table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Activité récente
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {auditLog && auditLog.length > 0 ? (
              auditLog.map((log) => (
                <div
                  key={log.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      <span className="text-violet-600">{log.action}</span>{' '}
                      <span className="text-gray-500">{log.resource}</span>
                    </p>
                    {log.resource_id && (
                      <p className="text-xs text-gray-400 truncate">
                        {log.resource_id}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {new Date(log.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Aucune activité enregistrée
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
