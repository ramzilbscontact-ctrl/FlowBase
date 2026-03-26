import { describe, it, expect } from 'vitest'
import { calculatePayslip } from '../lib/utils/payroll'

describe('calculatePayslip — Algerian IRG brackets', () => {
  it('returns zero IRG for SMIC-level salary (20,000 DZD)', () => {
    const result = calculatePayslip(20_000)
    // gross=20000, CNAS=1800, taxable=18200, annual=218400 (<240K → 0%)
    expect(result.grossSalary).toBe(20_000)
    expect(result.cnasDeduction).toBe(1_800)
    expect(result.irgDeduction).toBe(0)
    expect(result.netSalary).toBe(18_200)
  })

  it('applies 23% bracket for 30,000 DZD salary', () => {
    const result = calculatePayslip(30_000)
    // gross=30000, CNAS=2700, taxable=27300, annual=327600
    // IRG annual = (327600-240000)*0.23 = 20148 → monthly 1679
    expect(result.cnasDeduction).toBe(2_700)
    expect(result.irgDeduction).toBe(1_679)
    expect(result.netSalary).toBe(25_621)
  })

  it('applies 27% bracket for 60,000 DZD salary', () => {
    const result = calculatePayslip(60_000)
    // gross=60000, CNAS=5400, taxable=54600, annual=655200
    // IRG annual = 240000*0.23 + (655200-480000)*0.27 = 55200 + 47304 = 102504
    // monthly = 8542
    expect(result.cnasDeduction).toBe(5_400)
    expect(result.irgDeduction).toBe(8_542)
    expect(result.netSalary).toBe(46_058)
  })

  it('handles zero salary', () => {
    const result = calculatePayslip(0)
    expect(result.grossSalary).toBe(0)
    expect(result.cnasDeduction).toBe(0)
    expect(result.irgDeduction).toBe(0)
    expect(result.netSalary).toBe(0)
  })

  it('applies 30% bracket for 150,000 DZD salary', () => {
    const result = calculatePayslip(150_000)
    // gross=150000, CNAS=13500, taxable=136500, annual=1638000
    // IRG annual = 240000*0.23 + 960000*0.27 + (1638000-1440000)*0.30
    //            = 55200 + 259200 + 59400 = 373800
    // monthly = 31150
    expect(result.cnasDeduction).toBe(13_500)
    expect(result.irgDeduction).toBe(31_150)
    expect(result.netSalary).toBe(105_350)
  })

  it('applies 35% bracket for 350,000 DZD salary', () => {
    const result = calculatePayslip(350_000)
    // gross=350000, CNAS=31500, taxable=318500, annual=3822000
    // IRG annual = 240000*0.23 + 960000*0.27 + 1800000*0.30 + (3822000-3240000)*0.35
    //            = 55200 + 259200 + 540000 + 203700 = 1058100
    // monthly = 88175
    expect(result.cnasDeduction).toBe(31_500)
    expect(result.irgDeduction).toBe(88_175)
    expect(result.netSalary).toBe(230_325)
  })

  it('all amounts are rounded to 2 decimal places', () => {
    const result = calculatePayslip(33_333)
    expect(Number.isFinite(result.cnasDeduction)).toBe(true)
    expect(Number.isFinite(result.irgDeduction)).toBe(true)
    expect(Number.isFinite(result.netSalary)).toBe(true)
    // Verify: gross = cnas + irg + net
    expect(result.grossSalary).toBeCloseTo(
      result.cnasDeduction + result.irgDeduction + result.netSalary,
      0
    )
  })
})
