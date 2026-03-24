import { createClient } from '@/lib/supabase/server'
import { Calendar, Plus } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending:  'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
}

export default async function LeavesPage() {
  const supabase = await createClient()

  const { data: leaves, error } = await supabase
    .from('leave_requests')
    .select('id, employee_id, start_date, end_date, reason, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Congés</h1>
            <p className="text-sm text-gray-500">{leaves?.length ?? 0} demande{(leaves?.length ?? 0) !== 1 ? 's' : ''}</p>
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
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Employé</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Début</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Fin</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Motif</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!leaves || leaves.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">Aucune demande de congé</p>
                  <p className="text-xs mt-1">Cliquez sur &quot;Ajouter&quot; pour soumettre une demande de congé.</p>
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{l.employee_id}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {l.start_date ? new Date(l.start_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {l.end_date ? new Date(l.end_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[l.status] ?? l.status}
                    </span>
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
