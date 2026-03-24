import { createClient } from '@/lib/supabase/server'
import { FileText, Plus } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-orange-100 text-orange-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft:     'Brouillon',
  sent:      'Envoyée',
  paid:      'Payée',
  overdue:   'En retard',
  cancelled: 'Annulée',
}

function formatCurrency(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount)
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount, issue_date, due_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount ?? 0), 0) ?? 0
  const totalPending = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + (i.total_amount ?? 0), 0) ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Factures</h1>
            <p className="text-sm text-gray-500">{invoices?.length ?? 0} facture{(invoices?.length ?? 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Encaissé</p>
          <p className="text-lg font-bold text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">En attente</p>
          <p className="text-lg font-bold text-orange-700 mt-1">{formatCurrency(totalPending)}</p>
        </div>
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
              <th className="text-left px-4 py-3 font-semibold text-gray-600">N°</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Montant</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Émise le</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Échéance</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!invoices || invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">Aucune facture</p>
                  <p className="text-xs mt-1">Créez votre première facture pour commencer à facturer.</p>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
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
