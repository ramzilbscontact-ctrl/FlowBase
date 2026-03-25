'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Wallet } from 'lucide-react'
import { calculatePayslip } from '@/lib/utils/payroll'

const supabase = createClient()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmployeeOption = {
  id: string
  full_name: string
  base_salary: number
}

type PayslipRow = {
  id: string
  period_month: number
  period_year: number
  gross_salary: number
  cnas_deduction: number
  irg_deduction: number
  net_salary: number
  employee_id: string
  employees: { full_name: string } | null
}

type PayrollForm = {
  employee_id: string
  period_month: string
  period_year: string
}

const now = new Date()
const EMPTY_FORM: PayrollForm = {
  employee_id: '',
  period_month: String(now.getMonth() + 1),
  period_year: String(now.getFullYear()),
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PayrollPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<PayrollForm>(EMPTY_FORM)

  // ---- Employees ----
  const { data: empResult } = useQuery({
    queryKey: ['employees', '', ''],
    queryFn: async () =>
      supabase
        .from('employees')
        .select('id, full_name, base_salary')
        .is('deleted_at', null)
        .order('full_name'),
  })
  const employees: EmployeeOption[] = (empResult?.data as EmployeeOption[] | undefined) ?? []

  // ---- Payslips list ----
  const { data: payslipsResult, isLoading: payslipsLoading } = useQuery({
    queryKey: ['payslips'],
    queryFn: async () =>
      supabase
        .from('payslips')
        .select('id, period_month, period_year, gross_salary, cnas_deduction, irg_deduction, net_salary, employee_id, employees(full_name)')
        .order('generated_at', { ascending: false })
        .limit(100),
  })
  const payslips: PayslipRow[] = (payslipsResult?.data as PayslipRow[] | undefined) ?? []

  // ---- Live preview ----
  const preview = useMemo(() => {
    const emp = employees.find((e) => e.id === form.employee_id)
    if (!emp || !emp.base_salary) return null
    return calculatePayslip(emp.base_salary)
  }, [employees, form.employee_id])

  // ---- Generate mutation ----
  const generateMut = useMutation({
    mutationFn: async () => {
      const employee = employees.find((e) => e.id === form.employee_id)
      if (!employee) throw new Error('Employé non trouvé')
      const calc = calculatePayslip(employee.base_salary)
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('payslips').insert({
        employee_id: form.employee_id,
        period_month: parseInt(form.period_month),
        period_year: parseInt(form.period_year),
        gross_salary: calc.grossSalary,
        cnas_deduction: calc.cnasDeduction,
        irg_deduction: calc.irgDeduction,
        net_salary: calc.netSalary,
        owner_id: user!.id,
      })
      if (error) {
        // PostgreSQL unique violation code 23505 = duplicate payslip for this period
        if (error.code === '23505') throw new Error('Bulletin déjà généré pour cette période')
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslips'] })
      toast.success('Bulletin généré')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
          <Wallet className="w-5 h-5 text-violet-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Paie</h1>
      </div>

      {/* Main layout: two-panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: generate form */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Générer un bulletin</h2>

          {/* Employee select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
            <select
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
            >
              <option value="">— Sélectionner un employé —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
              <select
                value={form.period_month}
                onChange={(e) => setForm({ ...form, period_month: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
              <input
                type="number"
                min="2000"
                max="2099"
                value={form.period_year}
                onChange={(e) => setForm({ ...form, period_year: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          {/* Live preview */}
          {preview && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-gray-700 mb-3">Aperçu du bulletin</p>
              <div className="flex justify-between text-gray-600">
                <span>Salaire brut</span>
                <span>{preview.grossSalary.toLocaleString('fr-DZ')} DZD</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>CNAS (9%)</span>
                <span className="text-red-500">— {preview.cnasDeduction.toLocaleString('fr-DZ')} DZD</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IRG</span>
                <span className="text-red-500">— {preview.irgDeduction.toLocaleString('fr-DZ')} DZD</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                <span>Net à payer</span>
                <span className="text-green-600">= {preview.netSalary.toLocaleString('fr-DZ')} DZD</span>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={() => generateMut.mutate()}
            disabled={!form.employee_id || generateMut.isPending}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {generateMut.isPending ? 'Génération…' : 'Générer le bulletin'}
          </button>
        </div>

        {/* Right panel: payslips table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Bulletins générés</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Employé</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Période</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Brut</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">CNAS</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">IRG</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Net</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">PDF</th>
                </tr>
              </thead>
              <tbody>
                {payslipsLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Chargement…</td>
                  </tr>
                )}
                {!payslipsLoading && payslips.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="font-medium text-gray-500">Aucun bulletin</p>
                      <p className="text-xs text-gray-400 mt-1">Générez le premier bulletin via le formulaire.</p>
                    </td>
                  </tr>
                )}
                {payslips.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.employees?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {MONTH_NAMES[p.period_month - 1]} {p.period_year}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs">
                      {Number(p.gross_salary).toLocaleString('fr-DZ')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 text-xs">
                      {Number(p.cnas_deduction).toLocaleString('fr-DZ')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 text-xs">
                      {Number(p.irg_deduction).toLocaleString('fr-DZ')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600 text-xs">
                      {Number(p.net_salary).toLocaleString('fr-DZ')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={'/api/payslips/' + p.id + '/pdf'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-600 hover:underline text-xs"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
