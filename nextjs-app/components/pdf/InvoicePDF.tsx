import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page:     { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header:   { fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#1e40af' },
  subhead:  { fontSize: 10, color: '#6b7280', marginBottom: 20 },
  section:  { marginBottom: 14 },
  label:    { fontSize: 8, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 },
  value:    { fontSize: 10, color: '#111827' },
  row:      { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 5 },
  col1:     { flex: 3 },
  col2:     { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalLabel:{ fontSize: 10, color: '#374151', marginRight: 20 },
  totalVal: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
})

type InvoiceItem = { description: string; quantity: number; unit_price: number; total: number }
type Invoice = {
  invoice_number: string
  status: string
  issue_date: string | null
  due_date: string | null
  subtotal: number | null
  tax_rate: number | null
  tax_amount: number | null
  total: number | null
  notes: string | null
  invoice_items: InvoiceItem[]
  contacts: { first_name: string | null; last_name: string | null } | null
}

export function InvoicePDF({ invoice }: { invoice: Invoice }) {
  const clientName = invoice.contacts
    ? [invoice.contacts.first_name, invoice.contacts.last_name].filter(Boolean).join(' ')
    : 'Client'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>FACTURE {invoice.invoice_number}</Text>
        <Text style={styles.subhead}>Statut : {invoice.status}</Text>

        <View style={styles.section}>
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <View>
              <Text style={styles.label}>Client</Text>
              <Text style={styles.value}>{clientName}</Text>
            </View>
            <View>
              <Text style={styles.label}>{"Date d'émission"}</Text>
              <Text style={styles.value}>{invoice.issue_date ?? '—'}</Text>
            </View>
            <View>
              <Text style={styles.label}>{'Échéance'}</Text>
              <Text style={styles.value}>{invoice.due_date ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Items table header */}
        <View style={[styles.row, { backgroundColor: '#f9fafb' }]}>
          <Text style={[styles.col1, { fontWeight: 'bold' }]}>Description</Text>
          <Text style={[styles.col2, { fontWeight: 'bold' }]}>{'Qté'}</Text>
          <Text style={[styles.col2, { fontWeight: 'bold' }]}>P.U.</Text>
          <Text style={[styles.col2, { fontWeight: 'bold' }]}>Total</Text>
        </View>
        {(invoice.invoice_items ?? []).map((item, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.col1}>{item.description}</Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col2}>{Number(item.unit_price).toLocaleString()} DZD</Text>
            <Text style={styles.col2}>{Number(item.total).toLocaleString()} DZD</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Sous-total</Text>
          <Text style={styles.totalVal}>{Number(invoice.subtotal ?? 0).toLocaleString()} DZD</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TVA ({invoice.tax_rate ?? 0}%)</Text>
          <Text style={styles.totalVal}>{Number(invoice.tax_amount ?? 0).toLocaleString()} DZD</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>TOTAL</Text>
          <Text style={[styles.totalVal, { color: '#1d4ed8' }]}>{Number(invoice.total ?? 0).toLocaleString()} DZD</Text>
        </View>

        {invoice.notes && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
