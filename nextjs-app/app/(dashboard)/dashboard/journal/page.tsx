import { createClient } from '@/lib/supabase/server'
import { BookOpen } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'

export default async function JournalPage() {
  const supabase = await createClient()

  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('id, date, description, invoice_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PageShell
      title="Journal comptable"
      subtitle={`${entries?.length ?? 0} écriture${(entries?.length ?? 0) !== 1 ? 's' : ''}`}
      icon={BookOpen}
      iconBg="bg-amber-100"
      iconColor="text-amber-600"
    >
      <TableHead cols={['Date', 'Description', 'Statut', '']} />
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
        {!entries || entries.length === 0 ? (
          <EmptyRow
            colSpan={4}
            icon={BookOpen}
            message="Aucune écriture"
            hint={'Cliquez sur "Ajouter" pour créer votre première écriture comptable.'}
          />
        ) : (
          entries.map((e) => (
            <TableRow key={e.id}>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 text-gray-900">{e.description ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge
                  label={e.invoice_id ? 'Facture liée' : 'Manuel'}
                  colorClass={e.invoice_id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}
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
