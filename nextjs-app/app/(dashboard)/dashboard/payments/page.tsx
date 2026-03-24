import { createClient } from '@/lib/supabase/server'
import { CreditCard, Plus } from 'lucide-react'

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Virement bancaire',
  cash:          'Espèces',
  check:         'Chèque',
  card:          'Carte',
}

function formatCurrency(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount)
}

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, payment_date, method, amount, reference, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const totalAmount = payments?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paiements</h1>
            <p className="text-sm text-gray-500">{payments?.length ?? 0} paiement{(payments?.length ?? 0) !== 1 ? 's' : ''} · {formatCurrency(totalAmount)} total</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Error state */}
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
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Méthode</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Montant</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Référence</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!payments || payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">Aucun paiement</p>
                  <p className="text-xs mt-1">Cliquez sur &quot;Ajouter&quot; pour enregistrer votre premier paiement.</p>
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">
                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{METHOD_LABELS[p.method] ?? p.method ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.reference ?? '—'}</td>
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
