import { useQuery } from '@tanstack/react-query'
import { facturationAPI } from '../../api/facturation'
import DataTable from '../../components/shared/DataTable'

export default function Payments() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn:  () => facturationAPI.getPayments().then(r => r.data),
  })

  const payments = Array.isArray(data) ? data : data?.results || []

  const columns = [
    { key: 'date',       label: 'Date' },
    { key: 'invoice',    label: 'Facture', render: r => r.invoice?.number || '—' },
    { key: 'amount',     label: 'Montant', render: r => `${Number(r.amount || 0).toLocaleString()} DZD` },
    { key: 'method',     label: 'Méthode' },
    { key: 'status',     label: 'Statut', render: r => <span className="badge-green">{r.status || 'reçu'}</span> },
  ]

  return (
    <div>
      <DataTable columns={columns} data={payments} loading={isLoading} emptyMsg="Aucun paiement enregistré" />
    </div>
  )
}
