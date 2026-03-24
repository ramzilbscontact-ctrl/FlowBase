import { createClient } from '@/lib/supabase/server'
import { CheckSquare } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'

export default async function TasksPage() {
  const supabase = await createClient()

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, completed, due_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PageShell
      title="Tâches"
      subtitle={`${tasks?.length ?? 0} tâche${(tasks?.length ?? 0) !== 1 ? 's' : ''}`}
      icon={CheckSquare}
      iconBg="bg-purple-100"
      iconColor="text-purple-600"
    >
      <TableHead cols={['Titre', 'Statut', 'Échéance', '']} />
      <tbody>
        {error && (
          <tr>
            <td colSpan={4} className="px-4 py-3">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                Erreur lors du chargement : {error.message}
              </div>
            </td>
          </tr>
        )}
        {!tasks || tasks.length === 0 ? (
          <EmptyRow
            colSpan={4}
            icon={CheckSquare}
            message="Aucune tâche"
            hint='Cliquez sur "Ajouter" pour créer votre première tâche.'
          />
        ) : (
          tasks.map((t) => (
            <TableRow key={t.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
              <td className="px-4 py-3">
                <Badge
                  label={t.completed ? 'Terminé' : 'En cours'}
                  colorClass={t.completed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                />
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR') : '—'}
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
