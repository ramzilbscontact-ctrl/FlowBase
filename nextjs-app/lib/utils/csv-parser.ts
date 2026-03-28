/**
 * CSV Parser with auto-detection of separator, encoding, and column mapping.
 * Maps CSV columns to Supabase contacts fields.
 */

export type ContactField = 'first_name' | 'last_name' | 'email' | 'phone' | 'tags' | 'notes' | 'skip'

export interface ColumnMapping {
  csvHeader: string
  field: ContactField
}

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
  separator: string
  mapping: ColumnMapping[]
  totalRows: number
}

export interface ContactImportRow {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  tags?: string[]
  notes?: string
}

// Known column name → field mapping (case-insensitive)
const HEADER_MAP: Record<string, ContactField> = {
  // French
  'nom': 'last_name',
  'prénom': 'first_name',
  'prenom': 'first_name',
  'téléphone': 'phone',
  'telephone': 'phone',
  'tel': 'phone',
  'courriel': 'email',
  'étiquettes': 'tags',
  'etiquettes': 'tags',
  'remarques': 'notes',
  'nombre de séances': 'notes',
  'nombre de seances': 'notes',
  // English
  'name': 'first_name', // Will be split into first + last
  'first_name': 'first_name',
  'first name': 'first_name',
  'last_name': 'last_name',
  'last name': 'last_name',
  'email': 'email',
  'e-mail': 'email',
  'phone': 'phone',
  'mobile': 'phone',
  'tags': 'tags',
  'notes': 'notes',
  'comment': 'notes',
}

/**
 * Detect the best separator by checking which produces the most consistent columns
 */
function detectSeparator(text: string): string {
  const candidates = [',', ';', '\t', '|']
  const lines = text.split('\n').filter(l => l.trim()).slice(0, 10)

  let bestSep = ','
  let bestScore = 0

  for (const sep of candidates) {
    const counts = lines.map(l => l.split(sep).length)
    const first = counts[0]
    // Score = number of columns × consistency (all lines same count)
    const consistent = counts.every(c => c === first)
    const score = first * (consistent ? 2 : 1)
    if (score > bestScore && first > 1) {
      bestScore = score
      bestSep = sep
    }
  }

  return bestSep
}

/**
 * Try decoding with UTF-8, fall back to Latin-1
 */
export function decodeBuffer(buffer: ArrayBuffer): string {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    return text
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer)
  }
}

/**
 * Auto-map CSV headers to contact fields
 */
function autoMapHeaders(headers: string[]): ColumnMapping[] {
  const lowerHeaders = headers.map(h => h.trim().toLowerCase())
  const hasNameOnly = lowerHeaders.includes('name') && !lowerHeaders.includes('first_name') && !lowerHeaders.includes('prénom')

  return headers.map((csvHeader, i) => {
    const lower = csvHeader.trim().toLowerCase()
    const mapped = HEADER_MAP[lower]

    // Special case: "Name" column exists alone → map as first_name (split later)
    if (mapped === 'first_name' && hasNameOnly && lower === 'name') {
      return { csvHeader, field: 'first_name' as ContactField } // Will split in transform
    }

    return {
      csvHeader,
      field: mapped ?? 'skip' as ContactField,
    }
  })
}

/**
 * Parse CSV text into structured data with auto-detection
 */
export function parseCsv(text: string): ParsedCsv {
  const separator = detectSeparator(text)
  const lines = text.split('\n').filter(l => l.trim())

  if (lines.length === 0) {
    return { headers: [], rows: [], separator, mapping: [], totalRows: 0 }
  }

  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"(.*)"$/, '$1'))
  const rows = lines.slice(1).map(line =>
    line.split(separator).map(cell => cell.trim().replace(/^"(.*)"$/, '$1'))
  ).filter(row => row.some(cell => cell !== ''))

  const mapping = autoMapHeaders(headers)

  return { headers, rows, separator, mapping, totalRows: rows.length }
}

/**
 * Transform parsed rows into contact objects using the mapping
 */
export function transformToContacts(
  rows: string[][],
  mapping: ColumnMapping[],
  headers: string[]
): { contacts: ContactImportRow[]; errors: { row: number; message: string }[] } {
  const contacts: ContactImportRow[] = []
  const errors: { row: number; message: string }[] = []

  // Check if we have a single "Name" column that needs splitting
  const hasNameOnly = mapping.some(m =>
    m.field === 'first_name' && m.csvHeader.toLowerCase().trim() === 'name'
  ) && !mapping.some(m => m.field === 'last_name')

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const contact: Partial<ContactImportRow> = {}

    for (let j = 0; j < mapping.length; j++) {
      const { field } = mapping[j]
      const value = row[j]?.trim() ?? ''
      if (!value || field === 'skip') continue

      switch (field) {
        case 'first_name':
          if (hasNameOnly && value.includes(' ')) {
            // Split "Yassmina Benyahia" → first="Yassmina", last="Benyahia"
            const parts = value.split(/\s+/)
            contact.first_name = parts[0]
            contact.last_name = parts.slice(1).join(' ')
          } else {
            contact.first_name = value
          }
          break
        case 'last_name':
          contact.last_name = value
          break
        case 'email':
          contact.email = value
          break
        case 'phone':
          contact.phone = value
          break
        case 'tags':
          contact.tags = value.split(',').map(t => t.trim()).filter(Boolean)
          break
        case 'notes':
          contact.notes = value
          break
      }
    }

    // Validate: must have at least a name
    if (!contact.first_name && !contact.last_name) {
      errors.push({ row: i + 2, message: 'Nom manquant' })
      continue
    }

    contacts.push({
      first_name: contact.first_name ?? '',
      last_name: contact.last_name ?? '',
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags,
      notes: contact.notes,
    })
  }

  return { contacts, errors }
}
