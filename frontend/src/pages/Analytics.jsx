import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react'
import { crmAPI } from '../api/crm'
import { facturationAPI } from '../api/facturation'
import StatsCard from '../components/shared/StatsCard'

export default function Analytics() {
  const { data: crm }       = useQuery({ queryKey: ['crm-dashboard'], queryFn: () => crmAPI.dashboard().then(r => r.data) })
  const { data: invoices }  = useQuery({ queryKey: ['invoices'],      queryFn: () => facturationAPI.getInvoices().then(r => r.data) })

  const inv  = Array.isArray(invoices) ? invoices : invoices?.results || []
  const paid = inv.filter(i => i.status === 'paid')
  const ca   = paid.reduce((sum, i) => sum + Number(i.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total contacts"    value={crm?.total_contacts}  icon={Users}    color="blue" />
        <StatsCard label="Opportunités"      value={crm?.total_deals}     icon={TrendingUp} color="purple" />
        <StatsCard label="Factures émises"   value={inv.length}           icon={FileText} color="green" />
        <StatsCard label="CA encaissé"       value={`${ca.toLocaleString()} DZD`} icon={BarChart3} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals par stage */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Opportunités par étape</h3>
          {crm?.deals_by_stage ? (
            <ul className="space-y-2">
              {Object.entries(crm.deals_by_stage).map(([stage, count]) => (
                <li key={stage} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-600">{stage}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-2 bg-primary-500 rounded-full"
                        style={{ width: `${Math.min((count / (crm.total_deals || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-400">Aucune donnée</p>}
        </div>

        {/* Factures par statut */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Factures par statut</h3>
          {['draft', 'sent', 'paid', 'overdue'].map(status => {
            const count = inv.filter(i => i.status === status).length
            return (
              <div key={status} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                <span className="capitalize text-gray-600">{status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
