'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BookMarked } from 'lucide-react'
import { PageShell } from '@/components/ui/PageShell'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccountOption = {
  id: string
  code: string
  name: string
  type: string
}

type JournalLineRaw = {
  id: string
  debit: number
  credit: number
  description: string | null
  journal_entries: {
    id: string
    date: string
    description: string | null
  } | null
}

type LedgerLine = JournalLineRaw & { running_balance: number }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeLabel: Record<string, string> = {
  asset: 'Actif',
  liability: 'Passif',
  equity: 'Capitaux propres',
  income: 'Produits',
  expense: 'Charges',
}

const fmtDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n)

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function LedgerPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const { data: accountsData = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, type')
        .order('code')
      if (error) throw error
      return (data as AccountOption[]) ?? []
    },
  })

  const { data: linesData, isLoading } = useQuery({
    queryKey: ['ledger', selectedAccountId],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('journal_lines')
        .select('id, debit, credit, description, journal_entries(id, date, description)')
        .eq('account_id', selectedAccountId)
        .order('journal_entries(date)', { ascending: true })
      if (error) throw error
      return (data as JournalLineRaw[]) ?? []
    },
  })

  // -------------------------------------------------------------------------
  // Running balance computation
  // -------------------------------------------------------------------------

  const lines: LedgerLine[] = (linesData ?? []).map((line, i, arr) => {
    const cumulative = arr.slice(0, i + 1).reduce(
      (sum, l) => sum + Number(l.debit ?? 0) - Number(l.credit ?? 0),
      0,
    )
    return { ...line, running_balance: cumulative }
  })

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <PageShell
      title="Grand livre"
      icon={BookMarked}
      iconBg="bg-indigo-100"
      iconColor="text-indigo-600"
      toolbar={
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 shrink-0">Compte</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[280px]"
          >
            <option value="">— Sélectionnez un compte —</option>
            {accountsData.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name} ({typeLabel[a.type] ?? a.type})
              </option>
            ))}
          </select>
        </div>
      }
    >
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          {['Date', 'Libellé', 'Débit', 'Crédit', 'Solde courant'].map((col, i) => (
            <th
              key={i}
              className={`px-4 py-3 font-semibold text-gray-600 ${i >= 2 ? 'text-right' : 'text-left'}`}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {/* No account selected */}
        {!selectedAccountId && (
          <tr>
            <td colSpan={5} className="px-4 py-14 text-center">
              <BookMarked className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium text-gray-500">Sélectionnez un compte pour afficher le grand livre.</p>
            </td>
          </tr>
        )}

        {/* Loading */}
        {selectedAccountId && isLoading && (
          <tr>
            <td colSpan={5} className="px-4 py-10 text-center">
              <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </td>
          </tr>
        )}

        {/* Empty state */}
        {selectedAccountId && !isLoading && lines.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-14 text-center">
              <BookMarked className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium text-gray-500">Aucune écriture pour ce compte.</p>
            </td>
          </tr>
        )}

        {/* Data rows */}
        {selectedAccountId && !isLoading && lines.map((line) => {
          const entry = line.journal_entries as any
          const date = entry?.date
            ? new Date(entry.date).toLocaleDateString('fr-FR')
            : '—'
          const libelle = line.description || entry?.description || '—'
          const debit  = Number(line.debit  ?? 0)
          const credit = Number(line.credit ?? 0)
          const isPositive = line.running_balance >= 0

          return (
            <tr key={line.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-xs text-gray-500">{date}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{libelle}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-700">
                {debit > 0 ? fmtDZD(debit) : '—'}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-700">
                {credit > 0 ? fmtDZD(credit) : '—'}
              </td>
              <td
                className={`px-4 py-3 text-right text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {fmtDZD(line.running_balance)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </PageShell>
  )
}
