import { Instagram, Plus, AlertTriangle } from 'lucide-react'

export default function InstagramPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center">
            <Instagram className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Instagram</h1>
            <p className="text-sm text-gray-500">Intégration réseaux sociaux</p>
          </div>
        </div>
        <button
          disabled
          className="flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Connecter
        </button>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Intégration Instagram en cours de développement</p>
          <p className="text-xs text-amber-600 mt-1">
            Cette intégration via l&apos;API Meta permettra de gérer les messages directs Instagram,
            suivre les leads issus des réseaux sociaux et synchroniser les contacts.
          </p>
        </div>
      </div>

      {/* Placeholder messages list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm opacity-40 pointer-events-none">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Utilisateur</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Dernier message</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={3} className="px-4 py-12 text-center text-gray-300">
                <Instagram className="w-8 h-8 mx-auto mb-2" />
                <p>Connexion compte Instagram Business requise</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
