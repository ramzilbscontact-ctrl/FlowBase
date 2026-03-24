import { createClient } from '@/lib/supabase/server'
import { Users, Plus, Search } from 'lucide-react'

export default async function ContactsPage() {
  const supabase = await createClient()

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-500">{contacts?.length ?? 0} contact{(contacts?.length ?? 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un contact..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
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
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Téléphone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Créé le</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!contacts || contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">Aucun contact</p>
                  <p className="text-xs mt-1">Cliquez sur &quot;Ajouter&quot; pour créer votre premier contact.</p>
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
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
