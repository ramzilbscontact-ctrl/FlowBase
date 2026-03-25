'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CreditCard } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'

const supabase = createClient()

const METHOD_COLORS: Record<string, string> = {
  stripe:        'bg-violet-100 text-violet-700',
  bank_transfer: 'bg-blue-100 text-blue-700',
  cash:          'bg-green-100 text-green-700',
  check:         'bg-yellow-100 text-yellow-700',
}

const METHOD_LABELS: Record<string, string> = {
  stripe:        'Stripe',
  bank_transfer: 'Virement',
  cash:          'Espèces',
  check:         'Chèque',
}

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    maximumFractionDigits: 0,
  }).format(amount)
}

type PaymentWithInvoice = {
  id: string
  amount: number
  method: string | null
  paid_at: string
  reference: string | null
  invoice_id: string
  invoices: { invoice_number: string } | null
}

export default function PaymentsPage() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, method, paid_at, reference, invoice_id, invoices(invoice_number)')
        .order('paid_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as PaymentWithInvoice[]
    },
  })

  return (
    <PageShell
      title="Paiements"
      subtitle={
        isLoading
          ? '…'
          : `${payments?.length ?? 0} paiement${(payments?.length ?? 0) !== 1 ? 's' : ''}`
      }
      icon={CreditCard}
      iconBg="bg-emerald-100"
      iconColor="text-emerald-600"
    >
      <TableHead cols={['Date', 'Facture', 'Montant', 'Méthode', 'Référence']} />
      <tbody>
        {isLoading ? (
          <EmptyRow colSpan={5} icon={CreditCard} message="Chargement…" />
        ) : !payments || payments.length === 0 ? (
          <EmptyRow
            colSpan={5}
            icon={CreditCard}
            message="Aucun paiement"
            hint="Les paiements apparaissent ici une fois enregistrés."
          />
        ) : (
          payments.map((p) => (
            <TableRow key={p.id}>
              <td className="px-4 py-3 text-gray-600 text-sm">
                {p.paid_at ? new Date(p.paid_at).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-4 py-3 font-mono text-gray-700 text-sm">
                {p.invoices?.invoice_number ?? '—'}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">
                {formatCurrency(p.amount)}
              </td>
              <td className="px-4 py-3">
                {p.method ? (
                  <Badge
                    label={METHOD_LABELS[p.method] ?? p.method}
                    colorClass={METHOD_COLORS[p.method] ?? 'bg-gray-100 text-gray-600'}
                  />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                {p.reference ?? '—'}
              </td>
            </TableRow>
          ))
        )}
      </tbody>
    </PageShell>
  )
}
