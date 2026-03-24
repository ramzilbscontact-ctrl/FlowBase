import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Plus } from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  lead:       'bg-gray-100 text-gray-600',
  prospect:   'bg-blue-100 text-blue-700',
  proposal:   'bg-yellow-100 text-yellow-700',
  negotiation:'bg-orange-100 text-orange-700',
  won:        'bg-green-100 text-green-700',
  lost:       'bg-red-100 text-red-700',
}

const STAGE_LABELS: Record<string, string> = {
  lead:       'Lead',
  prospect:   'Prospect',
  proposal:   'Proposition',
  negotiation:'Négociation',
  won:        'Gagné',
  lost:       'Perdu',
}

function formatCurrency(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount)
}

export default async function DealsPage() {
  const supabase = await createClient()

  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, title, value, stage, expected_close_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const totalValue = deals?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pipeline de vente</h1>
            <p className="text-sm text-gray-500">{deals?.length ?? 0} opportunité{(deals?.length ?? 0) !== 1 ? 's' : ''} · {formatCurrency(totalValue)} total</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          Erreur lors du chargement : {error.message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Titre</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Étape</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Valeur</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Clôture prévue</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!deals || deals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">Aucune opportunité</p>
                  <p className="text-xs mt-1">Créez votre premier deal pour démarrer le pipeline.</p>
                </td>
              </tr>
            ) : (
              deals.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[d.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STAGE_LABELS[d.stage] ?? d.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(d.value)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {d.expected_close_date ? new Date(d.expected_close_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-violet-600 hover:underline">Voir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
