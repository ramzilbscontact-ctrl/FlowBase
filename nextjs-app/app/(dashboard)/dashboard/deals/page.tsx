import { createClient } from '@/lib/supabase/server'
import { TrendingUp } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'

const STAGE_COLORS: Record<string, string> = {
  lead:        'bg-gray-100 text-gray-600',
  prospect:    'bg-blue-100 text-blue-700',
  proposal:    'bg-yellow-100 text-yellow-700',
  negotiation: 'bg-orange-100 text-orange-700',
  won:         'bg-green-100 text-green-700',
  lost:        'bg-red-100 text-red-700',
}

const STAGE_LABELS: Record<string, string> = {
  lead:        'Lead',
  prospect:    'Prospect',
  proposal:    'Proposition',
  negotiation: 'Négociation',
  won:         'Gagné',
  lost:        'Perdu',
}

function formatCurrency(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount)
}

export default async function DealsPage() {
  const supabase = await createClient()

  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, title, value, stage, expected_close_date, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const totalValue = deals?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0

  return (
    <PageShell
      title="Pipeline de vente"
      subtitle={`${deals?.length ?? 0} opportunité${(deals?.length ?? 0) !== 1 ? 's' : ''} · ${formatCurrency(totalValue)} total`}
      icon={TrendingUp}
      iconBg="bg-emerald-100"
      iconColor="text-emerald-600"
    >
      <TableHead cols={['Titre', 'Étape', 'Valeur', 'Clôture prévue', '']} />
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
        {!deals || deals.length === 0 ? (
          <EmptyRow
            colSpan={5}
            icon={TrendingUp}
            message="Aucune opportunité"
            hint="Créez votre premier deal pour démarrer le pipeline."
          />
        ) : (
          deals.map((d) => (
            <TableRow key={d.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{d.title}</td>
              <td className="px-4 py-3">
                <Badge
                  label={STAGE_LABELS[d.stage] ?? d.stage}
                  colorClass={STAGE_COLORS[d.stage] ?? 'bg-gray-100 text-gray-600'}
                />
              </td>
              <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(d.value)}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {d.expected_close_date ? new Date(d.expected_close_date).toLocaleDateString('fr-FR') : '—'}
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
