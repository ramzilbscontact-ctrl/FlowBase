import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page:    { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  title:   { fontSize: 20, fontWeight: 'bold', marginBottom: 4, color: '#0f766e' },
  sub:     { fontSize: 10, color: '#6b7280', marginBottom: 20 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label:   { color: '#374151' },
  value:   { fontWeight: 'bold', color: '#111827' },
  netRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 10, backgroundColor: '#f0fdfa', paddingHorizontal: 10 },
  netLabel:{ fontSize: 12, fontWeight: 'bold', color: '#0f766e' },
  netValue:{ fontSize: 14, fontWeight: 'bold', color: '#0f766e' },
})

type Payslip = {
  period_month: number
  period_year: number
  gross_salary: number
  cnas_deduction: number
  irg_deduction: number
  net_salary: number
  employees: { full_name: string } | null
}

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export function PayslipPDF({ payslip }: { payslip: Payslip }) {
  const employeeName = payslip.employees?.full_name ?? 'Employé'
  const period = `${MONTH_NAMES[(payslip.period_month - 1)]} ${payslip.period_year}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>BULLETIN DE PAIE</Text>
        <Text style={styles.sub}>{period} — {employeeName}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Salaire brut</Text>
          <Text style={styles.value}>{Number(payslip.gross_salary).toLocaleString()} DZD</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cotisation CNAS (9%)</Text>
          <Text style={styles.value}>- {Number(payslip.cnas_deduction).toLocaleString()} DZD</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>IRG</Text>
          <Text style={styles.value}>- {Number(payslip.irg_deduction).toLocaleString()} DZD</Text>
        </View>
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>NET À PAYER</Text>
          <Text style={styles.netValue}>{Number(payslip.net_salary).toLocaleString()} DZD</Text>
        </View>
      </Page>
    </Document>
  )
}
