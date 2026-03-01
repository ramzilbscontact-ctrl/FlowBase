import { useQuery } from '@tanstack/react-query'
import { comptaAPI } from '../../api/comptabilite'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

function ReportCard({ title, items = [], total, positive }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium">{Number(item.value || 0).toLocaleString()} DZD</span>
          </li>
        ))}
      </ul>
      {total !== undefined && (
        <div className="border-t border-gray-200 mt-4 pt-3 flex justify-between font-bold">
          <span className="text-gray-800">Total</span>
          <span className={positive ? 'text-green-600' : 'text-red-600'}>
            {Number(total || 0).toLocaleString()} DZD
          </span>
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const bs = useQuery({ queryKey: ['balance-sheet'], queryFn: () => comptaAPI.balanceSheet().then(r => r.data) })
  const pl = useQuery({ queryKey: ['profit-loss'],   queryFn: () => comptaAPI.profitLoss().then(r => r.data) })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard
          title="Bilan — Actif"
          items={bs.data?.assets || []}
          total={bs.data?.total_assets}
          positive
        />
        <ReportCard
          title="Bilan — Passif"
          items={bs.data?.liabilities || []}
          total={bs.data?.total_liabilities}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard
          title="Compte de résultat — Produits"
          items={pl.data?.revenues || []}
          total={pl.data?.total_revenue}
          positive
        />
        <ReportCard
          title="Compte de résultat — Charges"
          items={pl.data?.expenses || []}
          total={pl.data?.total_expenses}
        />
      </div>
      {pl.data && (
        <div className="card p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pl.data.net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            {pl.data.net_profit >= 0 ? <TrendingUp className="text-green-600" /> : <TrendingDown className="text-red-600" />}
          </div>
          <div>
            <p className="text-sm text-gray-500">Résultat net</p>
            <p className={`text-2xl font-bold ${pl.data.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Number(pl.data.net_profit || 0).toLocaleString()} DZD
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
