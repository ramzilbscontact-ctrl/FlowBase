import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { crmAPI } from '../../api/crm'
import Modal from '../../components/shared/Modal'

const STAGES = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

const stageColors = {
  prospect:    'bg-gray-100   text-gray-700',
  qualified:   'bg-blue-100   text-blue-700',
  proposal:    'bg-yellow-100 text-yellow-700',
  negotiation: 'bg-orange-100 text-orange-700',
  won:         'bg-green-100  text-green-700',
  lost:        'bg-red-100    text-red-700',
}

const stageLabels = {
  prospect:    'Prospect',
  qualified:   'Qualifié',
  proposal:    'Proposition',
  negotiation: 'Négociation',
  won:         'Gagné',
  lost:        'Perdu',
}

export default function Deals() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState({ name: '', amount: '', stage: 'prospect', contact: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn:  () => crmAPI.getDeals().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => crmAPI.createDeal(d),
    onSuccess:  () => { qc.invalidateQueries(['deals']); setModal(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => crmAPI.updateDeal(id, d),
    onSuccess:  () => qc.invalidateQueries(['deals']),
  })

  const deals = Array.isArray(data) ? data : data?.results || []

  const byStage = (stage) => deals.filter(d => d.stage === stage)

  if (isLoading) return <div className="text-center text-gray-400 py-12">Chargement…</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{deals.length} opportunité(s)</p>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Nouvelle opportunité
        </button>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div key={stage} className="shrink-0 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className={`badge ${stageColors[stage]}`}>{stageLabels[stage]}</span>
              <span className="text-xs text-gray-400">{byStage(stage).length}</span>
            </div>
            <div className="space-y-2">
              {byStage(stage).map(deal => (
                <div key={deal.id} className="card p-3 cursor-pointer hover:shadow-md transition">
                  <p className="text-sm font-medium text-gray-800 mb-1">{deal.name}</p>
                  {deal.amount && (
                    <p className="text-xs text-gray-500">{Number(deal.amount).toLocaleString()} DZD</p>
                  )}
                  {deal.contact && (
                    <p className="text-xs text-gray-400 mt-1">{deal.contact?.first_name} {deal.contact?.last_name}</p>
                  )}
                  <select
                    className="mt-2 w-full text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none"
                    value={deal.stage}
                    onChange={e => updateMut.mutate({ id: deal.id, stage: e.target.value })}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}
                  </select>
                </div>
              ))}
              {byStage(stage).length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">
                  Vide
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle opportunité">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form) }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (DZD)</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Étape</label>
              <select className="input" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
                {STAGES.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>Créer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
