import { createClient } from '@/lib/supabase/server'
import { FileText } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-orange-100 text-orange-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft:     'Brouillon',
  sent:      'Envoyée',
  paid:      'Payée',
  overdue:   'En retard',
  cancelled: 'Annulée',
}

function formatCurrency(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount)
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount, issue_date, due_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount ?? 0), 0) ?? 0
  const totalPending = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + (i.total_amount ?? 0), 0) ?? 0

  const kpiCards = (
    <div className="grid grid-cols-2 gap-4 max-w-md">
      <div className="bg-green-50 border border-green-100 rounded-xl p-4">
        <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Encaissé</p>
        <p className="text-lg font-bold text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
      </div>
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
        <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">En attente</p>
        <p className="text-lg font-bold text-orange-700 mt-1">{formatCurrency(totalPending)}</p>
      </div>
    </div>
  )

  return (
    <PageShell
      title="Factures"
      subtitle={`${invoices?.length ?? 0} facture${(invoices?.length ?? 0) !== 1 ? 's' : ''}`}
      icon={FileText}
      iconBg="bg-blue-100"
      iconColor="text-blue-600"
      actionLabel="Nouvelle facture"
      toolbar={kpiCards}
    >
      <TableHead cols={['N°', 'Statut', 'Montant', 'Émise le', 'Échéance', '']} />
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
        {!invoices || invoices.length === 0 ? (
          <EmptyRow
            colSpan={6}
            icon={FileText}
            message="Aucune facture"
            hint="Créez votre première facture pour commencer à facturer."
          />
        ) : (
          invoices.map((inv) => (
            <TableRow key={inv.id}>
              <td className="px-4 py-3 font-mono font-medium text-gray-900">{inv.invoice_number}</td>
              <td className="px-4 py-3">
                <Badge
                  label={STATUS_LABELS[inv.status] ?? inv.status}
                  colorClass={STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}
                />
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(inv.total_amount)}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
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
