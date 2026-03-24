import { createClient } from '@/lib/supabase/server'
import { UserCheck, Plus } from 'lucide-react'

export default async function EmployeesPage() {
  const supabase = await createClient()

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, position, hire_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employés</h1>
            <p className="text-sm text-gray-500">{employees?.length ?? 0} employé{(employees?.length ?? 0) !== 1 ? 's' : ''}</p>
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
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Prénom Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Poste</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">{"Date d'embauche"}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!employees || employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">Aucun employé</p>
                  <p className="text-xs mt-1">Cliquez sur &quot;Ajouter&quot; pour enregistrer votre premier employé.</p>
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.first_name} {e.last_name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.position ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {e.hire_date ? new Date(e.hire_date).toLocaleDateString('fr-FR') : '—'}
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
