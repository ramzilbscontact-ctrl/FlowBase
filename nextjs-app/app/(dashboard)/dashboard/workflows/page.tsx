import { Workflow, Plus, AlertTriangle } from 'lucide-react'

export default function WorkflowsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
            <Workflow className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Workflows</h1>
            <p className="text-sm text-gray-500">Automatisation des processus</p>
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
          <p className="text-sm font-medium text-amber-800">Module workflows en cours de développement</p>
          <p className="text-xs text-amber-600 mt-1">
            Ce module permettra de créer des automatisations basées sur des déclencheurs et actions
            pour CRM, facturation, RH et intégrations tierces.
          </p>
        </div>
      </div>

      {/* Placeholder list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm opacity-40 pointer-events-none">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Déclencheur</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-gray-300">
                <Workflow className="w-8 h-8 mx-auto mb-2" />
                <p>Données disponibles après activation du module</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
