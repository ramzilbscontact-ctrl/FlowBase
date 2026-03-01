import { useQuery } from '@tanstack/react-query'
import { Users, TrendingUp, FileText, DollarSign, CheckSquare, Calendar } from 'lucide-react'
import { crmAPI } from '../api/crm'
import StatsCard from '../components/shared/StatsCard'

export default function Dashboard() {
  const { data } = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn:  () => crmAPI.dashboard().then(r => r.data),
  })

  const stats = data || {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Bonjour 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">Voici un aperçu de votre activité</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatsCard label="Contacts"       value={stats.total_contacts}     icon={Users}       color="blue" />
        <StatsCard label="Opportunités"   value={stats.total_deals}        icon={TrendingUp}  color="purple" />
        <StatsCard label="Factures"       value={stats.total_invoices}     icon={FileText}    color="green" />
        <StatsCard label="CA du mois"     value={stats.monthly_revenue ? `${stats.monthly_revenue?.toLocaleString()} DZD` : null} icon={DollarSign} color="yellow" />
        <StatsCard label="Tâches en cours" value={stats.open_tasks}        icon={CheckSquare} color="red" />
        <StatsCard label="Événements"     value={stats.upcoming_events}    icon={Calendar}    color="blue" />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Activité récente</h3>
          {stats.recent_deals?.length > 0 ? (
            <ul className="space-y-3">
              {stats.recent_deals.map((deal) => (
                <li key={deal.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{deal.name}</span>
                  <span className="badge-blue">{deal.stage}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Aucune opportunité récente</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Tâches à faire</h3>
          {stats.pending_tasks?.length > 0 ? (
            <ul className="space-y-3">
              {stats.pending_tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-orange-400 rounded-full shrink-0" />
                  <span className="text-gray-700">{task.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Aucune tâche en attente ✓</p>
          )}
        </div>
      </div>
    </div>
  )
}
