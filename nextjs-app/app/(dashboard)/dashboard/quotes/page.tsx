'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ClipboardList, Trash2, ArrowRight, Lock } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'
import type { Database } from '@/lib/types/database.types'

type QuoteRow = Database['public']['Tables']['quotes']['Row']

const supabase = createClient()

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft:    'Brouillon',
  sent:     'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
}

interface QuoteForm {
  contact_id: string
  valid_until: string
  tax_rate: string
  subtotal: string
  notes: string
}

function emptyForm(): QuoteForm {
  return {
    contact_id: '',
    valid_until: '',
    tax_rate: '19',
    subtotal: '',
    notes: '',
  }
}

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function QuotesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<QuoteForm>(emptyForm())

  function closeModal() {
    setModal(false)
    setForm(emptyForm())
  }

  // --- Query ---
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(
          'id, quote_number, status, total, valid_until, contact_id, converted_to_invoice_id, created_at'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  // --- Create mutation ---
  const createMut = useMutation({
    mutationFn: async (f: QuoteForm) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const subtotalNum = parseFloat(f.subtotal) || 0
      const taxRateNum = parseFloat(f.tax_rate) || 0
      const total = subtotalNum * (1 + taxRateNum / 100)

      const { error } = await supabase.from('quotes').insert({
        owner_id: user!.id,
        quote_number: 'DEV-' + Date.now().toString().slice(-6),
        contact_id: f.contact_id || null,
        valid_until: f.valid_until || null,
        subtotal: subtotalNum,
        tax_rate: taxRateNum,
        total,
        status: 'draft',
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toast.success('Devis créé')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // --- Soft delete ---
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toast.success('Devis supprimé')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // --- Convert to invoice ---
  const convertMut = useMutation({
    mutationFn: async (quote: Partial<QuoteRow> & { id: string; total: number }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: newInvoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          invoice_number: 'FAC-' + Date.now().toString().slice(-6),
          owner_id: user!.id,
          contact_id: quote.contact_id,
          subtotal: quote.total,
          tax_rate: quote.tax_rate ?? 0,
          tax_amount: 0,
          total: quote.total,
          status: 'draft',
        })
        .select('id')
        .single()
      if (invErr) throw invErr

      const { error: updateErr } = await supabase
        .from('quotes')
        .update({ converted_to_invoice_id: newInvoice.id, status: 'accepted' })
        .eq('id', quote.id)
      if (updateErr) throw updateErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Devis converti en facture')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <PageShell
        title="Devis"
        subtitle={isLoading ? '…' : `${quotes?.length ?? 0} devis`}
        icon={ClipboardList}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        actionLabel="Nouveau devis"
        onAction={() => {
          setModal(true)
        }}
      >
        <TableHead cols={['N°', 'Statut', 'Montant', 'Valable jusqu\'au', 'Actions']} />
        <tbody>
          {isLoading ? (
            <EmptyRow colSpan={5} icon={ClipboardList} message="Chargement…" />
          ) : !quotes || quotes.length === 0 ? (
            <EmptyRow
              colSpan={5}
              icon={ClipboardList}
              message="Aucun devis"
              hint='Cliquez sur "Nouveau devis" pour créer votre premier devis.'
            />
          ) : (
            quotes.map((q) => {
              const alreadyConverted = !!q.converted_to_invoice_id
              return (
                <TableRow key={q.id}>
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {q.quote_number ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={STATUS_LABELS[q.status] ?? q.status}
                      colorClass={STATUS_COLORS[q.status] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatCurrency(q.total)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {q.valid_until
                      ? new Date(q.valid_until).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      {alreadyConverted ? (
                        <span
                          className="p-1.5 text-gray-300"
                          title="Déjà converti en facture"
                        >
                          <Lock size={15} />
                        </span>
                      ) : (
                        <button
                          onClick={() => convertMut.mutate(q)}
                          disabled={convertMut.isPending}
                          className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition"
                          title="Convertir en facture"
                        >
                          <ArrowRight size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMut.mutate(q.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </TableRow>
              )
            })
          )}
        </tbody>
      </PageShell>

      {/* Create modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title="Nouveau devis"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMut.mutate(form)
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valable jusqu'au
              </label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TVA (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.tax_rate}
                onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant HT (DZD) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0"
              value={form.subtotal}
              onChange={(e) => setForm((f) => ({ ...f, subtotal: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              placeholder="Conditions, remarques…"
            />
          </div>

          {/* Total preview */}
          {form.subtotal && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Sous-total HT</span>
                <span>{formatCurrency(parseFloat(form.subtotal) || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>TVA ({form.tax_rate}%)</span>
                <span>
                  {formatCurrency(
                    (parseFloat(form.subtotal) || 0) * ((parseFloat(form.tax_rate) || 0) / 100)
                  )}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                <span>Total TTC</span>
                <span>
                  {formatCurrency(
                    (parseFloat(form.subtotal) || 0) *
                      (1 + (parseFloat(form.tax_rate) || 0) / 100)
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
            >
              {createMut.isPending ? 'Création…' : 'Créer le devis'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
