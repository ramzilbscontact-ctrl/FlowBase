import { createClient } from '@/lib/supabase/server'
import { Calendar } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending:  'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
}

export default async function LeavesPage() {
  const supabase = await createClient()

  const { data: leaves, error } = await supabase
    .from('leave_requests')
    .select('id, employee_id, type, start_date, end_date, status, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PageShell
      title="Congés"
      subtitle={`${leaves?.length ?? 0} demande${(leaves?.length ?? 0) !== 1 ? 's' : ''}`}
      icon={Calendar}
      iconBg="bg-rose-100"
      iconColor="text-rose-600"
    >
      <TableHead cols={['Employé', 'Début', 'Fin', 'Motif', 'Statut', '']} />
      <tbody>
        {error && (
          <tr>
            <td colSpan={6} className="px-4 py-3">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                Erreur lors du chargement : {error.message}
              </div>
            </td>
          </tr>
        )}
        {!leaves || leaves.length === 0 ? (
          <EmptyRow
            colSpan={6}
            icon={Calendar}
            message="Aucune demande de congé"
            hint={'Cliquez sur "Ajouter" pour soumettre une demande de congé.'}
          />
        ) : (
          leaves.map((l) => (
            <TableRow key={l.id}>
              <td className="px-4 py-3 text-gray-600 font-mono text-xs">{l.employee_id}</td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {l.start_date ? new Date(l.start_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {l.end_date ? new Date(l.end_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">{l.notes ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge
                  label={STATUS_LABELS[l.status] ?? l.status}
                  colorClass={STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}
                />
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
