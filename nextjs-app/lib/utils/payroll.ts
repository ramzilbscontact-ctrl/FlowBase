// =============================================================
// payroll.ts — Algerian payroll calculation utility
// CNAS: 9% of gross salary
// IRG: progressive on (gross - CNAS) annualized, divided by 12
// Brackets (2024): 0% ≤240K, 23% 240K-480K, 27% 480K-1.44M,
//                  30% 1.44M-3.24M, 35% >3.24M (annual DZD)
// =============================================================

export interface PayslipCalculation {
  grossSalary: number
  cnasDeduction: number
  taxableIncome: number
  irgDeduction: number
  netSalary: number
}

export function calculatePayslip(grossMonthlySalary: number): PayslipCalculation {
  const CNAS_RATE = 0.09

  const cnasDeduction = grossMonthlySalary * CNAS_RATE
  const taxableIncome = grossMonthlySalary - cnasDeduction
  const annualTaxable = taxableIncome * 12

  let annualIRG = 0
  if (annualTaxable <= 240_000) {
    annualIRG = 0
  } else if (annualTaxable <= 480_000) {
    annualIRG = (annualTaxable - 240_000) * 0.23
  } else if (annualTaxable <= 1_440_000) {
    annualIRG = 240_000 * 0.23 + (annualTaxable - 480_000) * 0.27
  } else if (annualTaxable <= 3_240_000) {
    annualIRG = 240_000 * 0.23 + 960_000 * 0.27 + (annualTaxable - 1_440_000) * 0.30
  } else {
    annualIRG = 240_000 * 0.23 + 960_000 * 0.27 + 1_800_000 * 0.30 + (annualTaxable - 3_240_000) * 0.35
  }

  const irgDeduction = annualIRG / 12
  const netSalary = grossMonthlySalary - cnasDeduction - irgDeduction

  return {
    grossSalary: grossMonthlySalary,
    cnasDeduction: Math.round(cnasDeduction * 100) / 100,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    irgDeduction: Math.round(irgDeduction * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100,
  }
}
