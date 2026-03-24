import { createClient } from '@/lib/supabase/server'
import { Receipt } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft:    'Brouillon',
  sent:     'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired:  'Expiré',
}

function formatCurrency(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount)
}

export default async function QuotesPage() {
  const supabase = await createClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, quote_number, status, total_amount, issue_date, expiry_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PageShell
      title="Devis"
      subtitle={`${quotes?.length ?? 0} devis`}
      icon={Receipt}
      iconBg="bg-indigo-100"
      iconColor="text-indigo-600"
    >
      <TableHead cols={['N°', 'Statut', 'Montant', 'Émis le', 'Expire le', '']} />
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
        {!quotes || quotes.length === 0 ? (
          <EmptyRow
            colSpan={6}
            icon={Receipt}
            message="Aucun devis"
            hint={'Cliquez sur "Ajouter" pour créer votre premier devis.'}
          />
        ) : (
          quotes.map((q) => (
            <TableRow key={q.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{q.quote_number ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge
                  label={STATUS_LABELS[q.status] ?? q.status}
                  colorClass={STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-600'}
                />
              </td>
              <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(q.total_amount)}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {q.issue_date ? new Date(q.issue_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {q.expiry_date ? new Date(q.expiry_date).toLocaleDateString('fr-FR') : '—'}
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
