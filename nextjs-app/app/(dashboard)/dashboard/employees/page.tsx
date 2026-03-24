import { createClient } from '@/lib/supabase/server'
import { UserCheck } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow } from '@/components/ui/PageShell'

export default async function EmployeesPage() {
  const supabase = await createClient()

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, position, hire_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PageShell
      title="Employés"
      subtitle={`${employees?.length ?? 0} employé${(employees?.length ?? 0) !== 1 ? 's' : ''}`}
      icon={UserCheck}
      iconBg="bg-teal-100"
      iconColor="text-teal-600"
    >
      <TableHead cols={['Prénom Nom', 'Email', 'Poste', "Date d'embauche", '']} />
      <tbody>
        {error && (
          <tr>
            <td colSpan={5} className="px-4 py-3">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                Erreur lors du chargement : {error.message}
              </div>
            </td>
          </tr>
        )}
        {!employees || employees.length === 0 ? (
          <EmptyRow
            colSpan={5}
            icon={UserCheck}
            message="Aucun employé"
            hint={'Cliquez sur "Ajouter" pour enregistrer votre premier employé.'}
          />
        ) : (
          employees.map((e) => (
            <TableRow key={e.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{e.first_name} {e.last_name}</td>
              <td className="px-4 py-3 text-gray-600">{e.email ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{e.position ?? '—'}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {e.hire_date ? new Date(e.hire_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <button className="text-xs text-violet-600 hover:underline">Voir</button>
              </td>
            </TableRow>
          ))
        )}
      </tbody>
    </PageShell>
  )
}
