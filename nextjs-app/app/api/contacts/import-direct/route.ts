export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* ------------------------------------------------------------------ */
/*  Direct CSV import — auto-detect structure, map columns, insert    */
/* ------------------------------------------------------------------ */

// Supported column aliases → contact fields (case-insensitive)
const ALIAS: Record<string, string> = {
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
  'name': '_fullname',         // special: split into first+last
  'first_name': 'first_name',
  'first name': 'first_name',
  'firstname': 'first_name',
  'last_name': 'last_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'email': 'email',
  'e-mail': 'email',
  'phone': 'phone',
  'mobile': 'phone',
  'tags': 'tags',
  'notes': 'notes',
  'comment': 'notes',
  'company': 'company_name',
  'entreprise': 'company_name',
  'société': 'company_name',
  'societe': 'company_name',
  'company_name': 'company_name',
}

// -------- helpers --------------------------------------------------

/** Try UTF-8 then fall back to Latin-1 */
function decodeBuffer(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('iso-8859-1').decode(buf)
  }
}

/** Pick the separator that produces the most consistent column count */
function detectSep(text: string): string {
  const lines = text.split('\n').filter(l => l.trim()).slice(0, 10)
  let best = ','
  let bestScore = 0
  for (const sep of [',', ';', '\t', '|']) {
    const counts = lines.map(l => splitRow(l, sep).length)
    const first = counts[0]
    const consistent = counts.every(c => c === first)
    const score = first * (consistent ? 2 : 1)
    if (score > bestScore && first > 1) {
      bestScore = score
      best = sep
    }
  }
  return best
}

/** Split a CSV row respecting quoted fields */
function splitRow(line: string, sep: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === sep && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

interface ContactInsert {
  owner_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  tags: string[]
  notes: string | null
  company_name: string | null
}

// -------- main handler ---------------------------------------------

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    // 1. Decode
    const buffer = await file.arrayBuffer()
    const text = decodeBuffer(buffer)
    const sep = detectSep(text)
    const lines = text.split('\n').filter(l => l.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'Le fichier est vide ou ne contient qu\'un en-tête' },
        { status: 400 }
      )
    }

    // 2. Parse headers & map
    const headers = splitRow(lines[0], sep).map(h =>
      h.replace(/^"(.*)"$/, '$1').trim()
    )

    const fieldMap: (string | null)[] = headers.map(h => {
      const key = h.toLowerCase().trim()
      return ALIAS[key] ?? null
    })

    // Check if we have a single "Name" (fullname) column and no separate first/last
    const hasFullName = fieldMap.includes('_fullname')
    const hasFirstName = fieldMap.includes('first_name')
    const hasLastName = fieldMap.includes('last_name')
    const needsSplit = hasFullName && !hasFirstName && !hasLastName

    // Must have at least one name-like column
    if (!hasFullName && !hasFirstName && !hasLastName) {
      return NextResponse.json(
        {
          error:
            'Aucune colonne "Nom", "Prénom", ou "Name" détectée. ' +
            `Colonnes trouvées : ${headers.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 3. Transform rows
    const contacts: ContactInsert[] = []
    const errors: { row: number; message: string }[] = []

    for (let i = 1; i < lines.length; i++) {
      const cells = splitRow(lines[i], sep).map(c =>
        c.replace(/^"(.*)"$/, '$1').trim()
      )
      if (cells.every(c => !c)) continue // skip blank rows

      let firstName: string | null = null
      let lastName: string | null = null
      let email: string | null = null
      let phone: string | null = null
      let tags: string[] = []
      let notes: string | null = null
      let companyName: string | null = null

      for (let j = 0; j < fieldMap.length; j++) {
        const field = fieldMap[j]
        const value = cells[j] ?? ''
        if (!field || !value) continue

        switch (field) {
          case '_fullname':
            if (needsSplit && value.includes(' ')) {
              const parts = value.split(/\s+/)
              firstName = parts[0]
              lastName = parts.slice(1).join(' ')
            } else {
              firstName = value
            }
            break
          case 'first_name':
            firstName = value
            break
          case 'last_name':
            lastName = value
            break
          case 'email':
            // Basic email validation
            if (value.includes('@')) {
              email = value
            }
            break
          case 'phone':
            phone = value
            break
          case 'tags':
            tags = value
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
            break
          case 'notes':
            notes = value
            break
          case 'company_name':
            companyName = value
            break
        }
      }

      // Validate: must have at least first or last name
      if (!firstName && !lastName) {
        errors.push({ row: i + 1, message: 'Nom manquant' })
        continue
      }

      contacts.push({
        owner_id: user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        tags,
        notes,
        company_name: companyName,
      })
    }

    if (contacts.length === 0) {
      return NextResponse.json({
        imported: 0,
        total: lines.length - 1,
        errors,
        message: 'Aucun contact valide trouvé',
      })
    }

    // 4. Batch insert into Supabase
    const BATCH = 500
    let totalImported = 0

    for (let i = 0; i < contacts.length; i += BATCH) {
      const batch = contacts.slice(i, i + BATCH)
      const { error: dbErr, count } = await supabase
        .from('contacts')
        .insert(batch)
        .select('id', { count: 'exact', head: true })

      if (dbErr) {
        errors.push({
          row: i + 2,
          message: `Erreur base de données : ${dbErr.message}`,
        })
      } else {
        totalImported += count ?? batch.length
      }
    }

    return NextResponse.json({
      imported: totalImported,
      total: contacts.length + errors.length,
      errors,
      message: `${totalImported} contact(s) importé(s)`,
    })
  } catch (err) {
    console.error('[contacts/import-direct] error:', err)
    return NextResponse.json(
      { error: "Erreur lors de l'import", details: String(err) },
      { status: 500 }
    )
  }
}
