import { createClient } from '@/lib/supabase/server'
import { CheckSquare } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done:        'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending:     'En attente',
  in_progress: 'En cours',
  done:        'Terminé',
  cancelled:   'Annulé',
}

const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high:   'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const PRIORITY_LABELS: Record<string, string> = {
  low:    'Basse',
  medium: 'Moyenne',
  high:   'Haute',
  urgent: 'Urgente',
}

export default async function TasksPage() {
  const supabase = await createClient()

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, created_at')
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
      <TableHead cols={['Titre', 'Statut', 'Priorité', 'Échéance', '']} />
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
        {!tasks || tasks.length === 0 ? (
          <EmptyRow
            colSpan={5}
            icon={CheckSquare}
            message="Aucune tâche"
            hint={'Cliquez sur "Ajouter" pour créer votre première tâche.'}
          />
        ) : (
          tasks.map((t) => (
            <TableRow key={t.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
              <td className="px-4 py-3">
                <Badge
                  label={STATUS_LABELS[t.status] ?? t.status}
                  colorClass={STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}
                />
              </td>
              <td className="px-4 py-3">
                <Badge
                  label={PRIORITY_LABELS[t.priority] ?? t.priority}
                  colorClass={PRIORITY_COLORS[t.priority] ?? 'bg-gray-100 text-gray-600'}
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
