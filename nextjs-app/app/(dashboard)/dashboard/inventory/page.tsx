import { Package, Plus, AlertTriangle } from 'lucide-react'

/**
 * Inventory module — Phase 2 placeholder
 *
 * The `inventory` table is not yet in the Supabase schema (Phase 1 covers CRM,
 * Facturation, Comptabilité, RH). This page will be wired to real data once
 * the inventory schema migration is applied in a future phase.
 */
export default function InventoryPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventaire</h1>
            <p className="text-sm text-gray-500">Gestion des stocks</p>
          </div>
        </div>
        <button
          disabled
          className="flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Ajouter un article
        </button>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Module en cours de développement</p>
          <p className="text-xs text-amber-600 mt-1">
            La table <code className="bg-amber-100 px-1 rounded">inventory</code> n&apos;est pas encore
            dans le schéma Supabase. Ce module sera activé dans une prochaine phase.
            Les modules CRM, Facturation, Comptabilité et RH sont déjà disponibles.
          </p>
        </div>
      </div>

      {/* Placeholder table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm opacity-50 pointer-events-none">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Référence</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Article</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Catégorie</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Stock</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Prix unitaire</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-gray-300">
                <Package className="w-8 h-8 mx-auto mb-2" />
                <p>Données disponibles après migration du schéma</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
