import { BarChart3, Plus, AlertTriangle } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">Tableaux de bord avancés</p>
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
          <p className="text-sm font-medium text-amber-800">Module analytics en cours de développement</p>
          <p className="text-xs text-amber-600 mt-1">
            Ce module offrira des visualisations interactives, indicateurs clés de performance (KPI)
            et tableaux de bord personnalisables à partir de toutes les données de l&apos;ERP.
          </p>
        </div>
      </div>

      {/* Placeholder charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-40 pointer-events-none">
        {['Évolution du CA', 'Pipeline de vente', 'Taux de recouvrement', 'Effectifs RH'].map((label) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-40 flex flex-col justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <div className="flex items-end gap-1 h-20">
              {[40, 60, 35, 80, 55, 70, 45, 90, 65, 75].map((h, i) => (
                <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
