import { createClient } from '@/lib/supabase/server'
import { Building2, Plus } from 'lucide-react'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, industry, website, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Entreprises</h1>
            <p className="text-sm text-gray-500">{companies?.length ?? 0} entreprise{(companies?.length ?? 0) !== 1 ? 's' : ''}</p>
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
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Secteur</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Site web</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Créé le</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!companies || companies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">Aucune entreprise</p>
                  <p className="text-xs mt-1">Cliquez sur &quot;Ajouter&quot; pour créer votre première entreprise.</p>
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.website ? (
                      <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {c.website}
                      </a>
                    ) : '—'}
                  </td>
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
