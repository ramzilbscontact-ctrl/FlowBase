'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, RefreshCw, TrendingUp, TrendingDown, Scale } from 'lucide-react'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JournalLineWithAccount = {
  debit: number
  credit: number
  accounts: { type: string; name: string } | null
}

type Totals = Record<'asset' | 'liability' | 'equity' | 'income' | 'expense', { debit: number; credit: number }>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n)

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  colorClass,
}: {
  label: string
  value: number
  bold?: boolean
  colorClass?: string
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'border-t border-gray-200 mt-2 pt-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-medium ${colorClass ?? (bold ? 'text-gray-900' : 'text-gray-700')}`}>
        {fmtDZD(value)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const qc = useQueryClient()

  const { data: lines, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_lines')
        .select('debit, credit, accounts(type, name)')
        .not('accounts', 'is', null)
      if (error) throw error
      return (data as JournalLineWithAccount[]) ?? []
    },
  })

  // -------------------------------------------------------------------------
  // Client-side aggregation
  // -------------------------------------------------------------------------

  const totals: Totals = {
    asset:     { debit: 0, credit: 0 },
    liability: { debit: 0, credit: 0 },
    equity:    { debit: 0, credit: 0 },
    income:    { debit: 0, credit: 0 },
    expense:   { debit: 0, credit: 0 },
  }

  if (lines) {
    for (const line of lines) {
      const type = (line.accounts as any)?.type as keyof Totals | undefined
      if (type && totals[type]) {
        totals[type].debit  += Number(line.debit  ?? 0)
        totals[type].credit += Number(line.credit ?? 0)
      }
    }
  }

  // Income statement
  const totalIncome  = totals.income.credit  - totals.income.debit
  const totalCharges = totals.expense.debit  - totals.expense.credit
  const netResult    = totalIncome - totalCharges

  // Balance sheet
  const totalAssets      = totals.asset.debit     - totals.asset.credit
  const totalLiabilities = totals.liability.credit - totals.liability.debit
  const totalEquity      = totals.equity.credit    - totals.equity.debit
  const totalPassif      = totalLiabilities + totalEquity
  const isBalanced       = Math.abs(totalAssets - totalPassif) < 0.01

  const hasData = lines && lines.length > 0

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">Rapports financiers</h1>
            <p className="text-sm text-gray-500 truncate">Compte de résultat et bilan</p>
          </div>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['reports'] })}
          className="shrink-0 flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraîchir
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasData && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">Aucune écriture comptable</p>
          <p className="text-sm text-gray-400 mt-1">
            Commencez par saisir des écritures dans le journal.
          </p>
        </div>
      )}

      {/* Reports */}
      {!isLoading && hasData && (
        <>
          {/* ================================================================
              Compte de résultat
          ================================================================ */}
          <SectionCard title="Compte de résultat">
            <div className="flex items-center gap-2 mb-4">
              {netResult >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <h2 className="text-base font-semibold text-gray-900">Compte de résultat</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Produits */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2">Produits</p>
                <Row label="Total produits" value={totalIncome} colorClass="text-green-600" />
              </div>
              {/* Charges */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">Charges</p>
                <Row label="Total charges" value={totalCharges} colorClass="text-red-600" />
              </div>
            </div>
            {/* Net result */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                {netResult >= 0 ? 'Bénéfice net' : 'Perte nette'}
              </span>
              <span
                className={`text-lg font-bold ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {fmtDZD(Math.abs(netResult))}
              </span>
            </div>
          </SectionCard>

          {/* ================================================================
              Bilan
          ================================================================ */}
          <SectionCard title="Bilan">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">Bilan</h2>
              </div>
              {isBalanced ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Bilan équilibré
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Bilan déséquilibré
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Actif */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">Actif</p>
                <Row label="Total actif" value={totalAssets} colorClass="text-blue-700" bold />
              </div>
              {/* Passif */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 mb-2">Passif</p>
                <Row label="Dettes"            value={totalLiabilities} colorClass="text-orange-700" />
                <Row label="Capitaux propres"  value={totalEquity}      colorClass="text-purple-700" />
                <Row label="Total passif"      value={totalPassif}      colorClass="text-orange-700" bold />
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}
