import { createClient } from '@/lib/supabase/server'
import { CreditCard } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow } from '@/components/ui/PageShell'

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Virement bancaire',
  cash:          'Espèces',
  check:         'Chèque',
  card:          'Carte',
}

function formatCurrency(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount)
}

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, payment_date, method, amount, reference, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const totalAmount = payments?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0

  return (
    <PageShell
      title="Paiements"
      subtitle={`${payments?.length ?? 0} paiement${(payments?.length ?? 0) !== 1 ? 's' : ''} · ${formatCurrency(totalAmount)} total`}
      icon={CreditCard}
      iconBg="bg-green-100"
      iconColor="text-green-600"
    >
      <TableHead cols={['Date', 'Méthode', 'Montant', 'Référence', '']} />
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
        {!payments || payments.length === 0 ? (
          <EmptyRow
            colSpan={5}
            icon={CreditCard}
            message="Aucun paiement"
            hint={'Cliquez sur "Ajouter" pour enregistrer votre premier paiement.'}
          />
        ) : (
          payments.map((p) => (
            <TableRow key={p.id}>
              <td className="px-4 py-3 text-gray-600">
                {p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">{METHOD_LABELS[p.method] ?? p.method ?? '—'}</td>
              <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(p.amount)}</td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.reference ?? '—'}</td>
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
