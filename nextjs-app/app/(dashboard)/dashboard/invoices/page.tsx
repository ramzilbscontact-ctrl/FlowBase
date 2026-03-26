'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { FileText, Pencil, Trash2, Plus, X } from 'lucide-react'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'
import type { Database } from '@/lib/types/database.types'

type InvoiceRow = Database['public']['Tables']['invoices']['Row']

const supabase = createClient()

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

const STATUS_FILTER_TABS = [
  { value: '',          label: 'Tous' },
  { value: 'draft',     label: 'Brouillon' },
  { value: 'sent',      label: 'Envoyée' },
  { value: 'paid',      label: 'Payée' },
  { value: 'overdue',   label: 'En retard' },
  { value: 'cancelled', label: 'Annulée' },
]

interface LineItem {
  description: string
  quantity: string
  unit_price: string
}

interface InvoiceForm {
  contact_id: string
  due_date: string
  tax_rate: string
  notes: string
  items: LineItem[]
}

function emptyItem(): LineItem {
  return { description: '', quantity: '1', unit_price: '' }
}

function emptyForm(): InvoiceForm {
  return {
    contact_id: '',
    due_date: '',
    tax_rate: '19',
    notes: '',
    items: [emptyItem()],
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

function computeTotals(items: LineItem[], taxRate: string) {
  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return sum + qty * price
  }, 0)
  const taxRateNum = parseFloat(taxRate) || 0
  const tax_amount = subtotal * (taxRateNum / 100)
  const total = subtotal + tax_amount
  return { subtotal, tax_amount, total }
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<(Partial<InvoiceRow> & { id: string }) | null>(null)
  const [form, setForm] = useState<InvoiceForm>(emptyForm())

  function resetForm() {
    setForm(emptyForm())
  }

  function openEdit(inv: Partial<InvoiceRow> & { id: string }) {
    setEditingInvoice(inv)
    setForm({
      contact_id: inv.contact_id ?? '',
      due_date: inv.due_date ?? '',
      tax_rate: String(inv.tax_rate ?? 19),
      notes: inv.notes ?? '',
      items: [emptyItem()], // items re-fetch not implemented; user can re-enter
    })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditingInvoice(null)
    resetForm()
  }

  // --- Query ---
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('invoices')
        .select('id, invoice_number, status, total, subtotal, tax_amount, issue_date, due_date, contact_id, notes, tax_rate, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (statusFilter) q = q.eq('status', statusFilter)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })

  // --- Save mutation (create + edit) ---
  const saveMut = useMutation({
    mutationFn: async (f: InvoiceForm) => {
      const { subtotal, tax_amount, total } = computeTotals(f.items, f.tax_rate)

      if (editingInvoice) {
        // Edit branch
        const { error: updateErr } = await supabase
          .from('invoices')
          .update({
            subtotal,
            tax_rate: parseFloat(f.tax_rate) || 0,
            tax_amount,
            total,
            due_date: f.due_date || null,
            notes: f.notes || null,
          })
          .eq('id', editingInvoice.id)
        if (updateErr) throw updateErr

        // Delete existing items and re-insert
        const { error: delErr } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', editingInvoice.id)
        if (delErr) throw delErr

        const itemRows = f.items
          .filter((it) => it.description.trim())
          .map((it) => ({
            invoice_id: editingInvoice.id,
            description: it.description,
            quantity: parseFloat(it.quantity) || 1,
            unit_price: parseFloat(it.unit_price) || 0,
            total: (parseFloat(it.quantity) || 1) * (parseFloat(it.unit_price) || 0),
          }))

        if (itemRows.length > 0) {
          const { error: itemErr } = await supabase.from('invoice_items').insert(itemRows)
          if (itemErr) throw itemErr
        }
      } else {
        // Create branch
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const invoice_number = 'FAC-' + Date.now().toString().slice(-6)

        const { data: newInvoice, error: insertErr } = await supabase
          .from('invoices')
          .insert({
            owner_id: user!.id,
            invoice_number,
            contact_id: f.contact_id || null,
            due_date: f.due_date || null,
            subtotal,
            tax_rate: parseFloat(f.tax_rate) || 0,
            tax_amount,
            total,
            notes: f.notes || null,
            status: 'draft',
          })
          .select('id')
          .single()
        if (insertErr) throw insertErr

        const itemRows = f.items
          .filter((it) => it.description.trim())
          .map((it) => ({
            invoice_id: newInvoice.id,
            description: it.description,
            quantity: parseFloat(it.quantity) || 1,
            unit_price: parseFloat(it.unit_price) || 0,
            total: (parseFloat(it.quantity) || 1) * (parseFloat(it.unit_price) || 0),
          }))

        if (itemRows.length > 0) {
          const { error: itemErr } = await supabase.from('invoice_items').insert(itemRows)
          if (itemErr) throw itemErr
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(editingInvoice ? 'Facture modifiée' : 'Facture créée')
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // --- Soft delete ---
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Facture supprimée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // --- Line item helpers ---
  function updateItem(index: number, field: keyof LineItem, value: string) {
    setForm((f) => {
      const items = [...f.items]
      items[index] = { ...items[index], [field]: value }
      return { ...f, items }
    })
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))
  }

  function removeItem(index: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }))
  }

  const { subtotal, tax_amount, total } = computeTotals(form.items, form.tax_rate)

  // --- Status filter toolbar ---
  const filterTabs = (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_FILTER_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setStatusFilter(tab.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            statusFilter === tab.value
              ? 'bg-violet-100 text-violet-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <PageShell
        title="Factures"
        subtitle={isLoading ? '…' : `${invoices?.length ?? 0} facture${(invoices?.length ?? 0) !== 1 ? 's' : ''}`}
        icon={FileText}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        actionLabel="Nouvelle facture"
        onAction={() => {
          setEditingInvoice(null)
          resetForm()
          setModal(true)
        }}
        toolbar={filterTabs}
      >
        <TableHead cols={['N°', 'Statut', 'Montant', 'Émise le', 'Échéance', 'Actions']} />
        <tbody>
          {isLoading ? (
            <EmptyRow colSpan={6} icon={FileText} message="Chargement…" />
          ) : !invoices || invoices.length === 0 ? (
            <EmptyRow
              colSpan={6}
              icon={FileText}
              message="Aucune facture"
              hint='Créez votre première facture pour commencer à facturer.'
            />
          ) : (
            invoices.map((inv) => (
              <TableRow key={inv.id}>
                <td className="px-4 py-3 font-mono font-medium text-gray-900">
                  {inv.invoice_number}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={STATUS_LABELS[inv.status] ?? inv.status}
                    colorClass={STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {formatCurrency(inv.total)}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {inv.issue_date
                    ? new Date(inv.issue_date).toLocaleDateString('fr-FR')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {inv.due_date
                    ? new Date(inv.due_date).toLocaleDateString('fr-FR')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition text-xs"
                      title="Télécharger PDF"
                    >
                      PDF
                    </a>
                    <button
                      onClick={() => openEdit(inv)}
                      className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition"
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteMut.mutate(inv.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </TableRow>
            ))
          )}
        </tbody>
      </PageShell>

      {/* Create / Edit Modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}
        size="xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMut.mutate(form)
          }}
          className="space-y-5"
        >
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Échéance
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
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
              Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              placeholder="Notes internes ou conditions de paiement…"
            />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Lignes de facturation</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                <Plus size={13} />
                Ajouter une ligne
              </button>
            </div>

            {/* Items table header */}
            <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-right">Qté</div>
              <div className="col-span-3 text-right">Prix unit.</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {form.items.map((item, i) => {
                const lineTotal =
                  (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Description du service ou produit"
                        value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div className="col-span-1 text-right text-sm text-gray-600 font-medium">
                      {lineTotal.toLocaleString('fr-DZ')}
                    </div>
                    <div className="col-span-1 text-right">
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totals summary */}
            <div className="mt-4 border-t border-gray-100 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Sous-total HT</span>
                <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>TVA ({form.tax_rate}%)</span>
                <span className="font-medium text-gray-700">{formatCurrency(tax_amount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
                <span>Total TTC</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
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
              disabled={saveMut.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
            >
              {saveMut.isPending
                ? 'Enregistrement…'
                : editingInvoice
                ? 'Enregistrer'
                : 'Créer la facture'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
