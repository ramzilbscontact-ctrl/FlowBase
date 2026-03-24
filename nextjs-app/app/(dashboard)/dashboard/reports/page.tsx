import { BarChart3, Plus, AlertTriangle } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rapports</h1>
            <p className="text-sm text-gray-500">Analyse et statistiques</p>
          </div>
        </div>
        <button
          disabled
          className="flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Module rapports en cours de développement</p>
          <p className="text-xs text-amber-600 mt-1">
            Ce module sera disponible dans une prochaine phase. Les tableaux de bord et rapports analytiques
            seront générés à partir des données CRM, facturation et comptabilité.
          </p>
        </div>
      </div>

      {/* Placeholder grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-40 pointer-events-none">
        {['Chiffre d\'affaires', 'Taux de conversion', 'Paiements reçus', 'Devis acceptés', 'Employés actifs', 'Dépenses RH'].map((label) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-300 mt-2">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
