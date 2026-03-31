export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Client as NotionClient } from '@notionhq/client'
import { decrypt } from '@/lib/google/encrypt'

type ExportType = 'contacts' | 'deals' | 'invoices'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the user's Notion token
  const { data: tokenRow } = await supabase
    .from('notion_tokens')
    .select('access_token')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Notion not connected. Please connect Notion first.' }, { status: 400 })
  }

  const accessToken = decrypt(tokenRow.access_token)

  const body = await request.json()
  const exportType: ExportType = body.type
  const notionDatabaseId: string | undefined = body.notion_database_id

  if (!['contacts', 'deals', 'invoices'].includes(exportType)) {
    return NextResponse.json({ error: 'Invalid export type. Must be contacts, deals, or invoices.' }, { status: 400 })
  }

  const notion = new NotionClient({ auth: accessToken })

  try {
    // Fetch CRM data from Supabase
    let crmData: Record<string, unknown>[] = []
    if (exportType === 'contacts') {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)
      crmData = data ?? []
    } else if (exportType === 'deals') {
      const { data } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      crmData = data ?? []
    } else if (exportType === 'invoices') {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      crmData = data ?? []
    }

    let databaseId = notionDatabaseId

    // Create a new Notion database if no ID was provided
    if (!databaseId) {
      // Search for a parent page to put the database in
      const searchRes = await notion.search({
        filter: { property: 'object', value: 'page' },
        page_size: 1,
      })

      let parentPageId: string | undefined
      if (searchRes.results.length > 0) {
        parentPageId = searchRes.results[0].id
      }

      if (!parentPageId) {
        return NextResponse.json(
          { error: 'No Notion pages found. Please create at least one page in Notion first.' },
          { status: 400 }
        )
      }

      const properties = buildDatabaseProperties(exportType)
      const db = await notion.databases.create({
        parent: { page_id: parentPageId, type: 'page_id' },
        title: [{ type: 'text', text: { content: `GetAgenzia CRM — ${capitalize(exportType)}` } }],
        properties,
      })
      databaseId = db.id
    }

    // Add pages to the Notion database
    let exported = 0
    for (const row of crmData) {
      const properties = buildPageProperties(exportType, row)
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      })
      exported++
    }

    return NextResponse.json({
      success: true,
      exported,
      notion_database_id: databaseId,
      type: exportType,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[notion/export] Error:', errMsg)
    return NextResponse.json({ error: `Notion export failed: ${errMsg}` }, { status: 500 })
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildDatabaseProperties(type: ExportType): Record<string, any> {
  if (type === 'contacts') {
    return {
      Name: { title: {} },
      Email: { email: {} },
      Phone: { phone_number: {} },
      Company: { rich_text: {} },
      Tags: { multi_select: { options: [] } },
      'Created At': { date: {} },
    }
  }
  if (type === 'deals') {
    return {
      Title: { title: {} },
      Value: { number: { format: 'dollar' } },
      Stage: { select: { options: [] } },
      'Contact Name': { rich_text: {} },
      'Created At': { date: {} },
    }
  }
  // invoices
  return {
    'Invoice Number': { title: {} },
    Status: { select: { options: [
      { name: 'draft', color: 'gray' },
      { name: 'sent', color: 'blue' },
      { name: 'paid', color: 'green' },
      { name: 'overdue', color: 'red' },
      { name: 'cancelled', color: 'orange' },
    ] } },
    Subtotal: { number: { format: 'dollar' } },
    'Tax Rate': { number: { format: 'percent' } },
    'Due Date': { date: {} },
    'Created At': { date: {} },
  }
}

function buildPageProperties(type: ExportType, row: Record<string, any>): Record<string, any> {
  if (type === 'contacts') {
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unnamed'
    return {
      Name: { title: [{ text: { content: name } }] },
      Email: { email: row.email || null },
      Phone: { phone_number: row.phone || null },
      Company: { rich_text: [{ text: { content: row.company_name || '' } }] },
      Tags: { multi_select: (row.tags || []).map((t: string) => ({ name: t })) },
      'Created At': row.created_at ? { date: { start: row.created_at } } : undefined,
    }
  }
  if (type === 'deals') {
    return {
      Title: { title: [{ text: { content: row.title || 'Untitled Deal' } }] },
      Value: { number: row.value ?? 0 },
      'Contact Name': { rich_text: [{ text: { content: row.contact_name || '' } }] },
      'Created At': row.created_at ? { date: { start: row.created_at } } : undefined,
    }
  }
  // invoices
  return {
    'Invoice Number': { title: [{ text: { content: row.invoice_number || '' } }] },
    Status: row.status ? { select: { name: row.status } } : undefined,
    Subtotal: { number: row.subtotal ?? 0 },
    'Tax Rate': { number: row.tax_rate ?? 0 },
    'Due Date': row.due_date ? { date: { start: row.due_date } } : undefined,
    'Created At': row.created_at ? { date: { start: row.created_at } } : undefined,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
