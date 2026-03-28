export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseCsv, transformToContacts, decodeBuffer } from '@/lib/utils/csv-parser'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mappingJson = formData.get('mapping') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    // Decode file
    const buffer = await file.arrayBuffer()
    const text = decodeBuffer(buffer)
    const parsed = parseCsv(text)

    // Use custom mapping if provided, else auto-mapping
    const mapping = mappingJson ? JSON.parse(mappingJson) : parsed.mapping

    const { contacts, errors } = transformToContacts(parsed.rows, mapping, parsed.headers)

    if (contacts.length === 0) {
      return NextResponse.json({
        imported: 0,
        errors,
        message: 'Aucun contact valide trouvé dans le fichier',
      })
    }

    // Batch insert (Supabase supports up to 1000 rows per insert)
    const BATCH_SIZE = 500
    let totalImported = 0
    const insertErrors: { row: number; message: string }[] = [...errors]

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE).map(c => ({
        owner_id: user.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email || null,
        phone: c.phone || null,
        tags: c.tags ?? [],
        notes: c.notes || null,
      }))

      const { error, count } = await supabase
        .from('contacts')
        .insert(batch)
        .select('id', { count: 'exact', head: true })

      if (error) {
        insertErrors.push({
          row: i + 2,
          message: `Batch error: ${error.message}`,
        })
      } else {
        totalImported += count ?? batch.length
      }
    }

    return NextResponse.json({
      imported: totalImported,
      total: contacts.length,
      errors: insertErrors,
      message: `${totalImported} contact(s) importé(s) sur ${contacts.length}`,
    })
  } catch (err) {
    console.error('[contacts/import] error:', err)
    return NextResponse.json(
      { error: 'Erreur lors de l\'import', details: String(err) },
      { status: 500 }
    )
  }
}
