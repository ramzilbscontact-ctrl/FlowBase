import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

const DAILY_REQUEST_LIMIT = 50

const gateway = createOpenAICompatible({
  name: 'vercel-ai-gateway',
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
})

async function getCRMContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const [contactsRes, dealsRes, tasksRes, activityRes] = await Promise.all([
    // Contacts count + recent 5
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Deals summary
    supabase
      .from('deals')
      .select('id, name, value, stage_id, stages(name), created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // Tasks due today
    supabase
      .from('tasks')
      .select('id, title, due_date, priority, completed')
      .eq('user_id', userId)
      .eq('completed', false)
      .gte('due_date', today)
      .lte('due_date', today + 'T23:59:59')
      .order('priority', { ascending: false })
      .limit(10),

    // Recent activity (last 5 contacts added)
    supabase
      .from('contacts')
      .select('id, first_name, last_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Contacts count
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Aggregate deals by stage
  const deals = dealsRes.data ?? []
  const dealsByStage: Record<string, { count: number; value: number }> = {}
  let totalDealValue = 0

  for (const deal of deals) {
    const stageName = (deal.stages as { name: string } | null)?.name ?? 'Sans étape'
    if (!dealsByStage[stageName]) {
      dealsByStage[stageName] = { count: 0, value: 0 }
    }
    dealsByStage[stageName].count++
    dealsByStage[stageName].value += deal.value ?? 0
    totalDealValue += deal.value ?? 0
  }

  const stagesSummary = Object.entries(dealsByStage)
    .map(([stage, data]) => `  - ${stage}: ${data.count} deals (${data.value.toLocaleString('fr-FR')} DA)`)
    .join('\n')

  const recentContacts = (contactsRes.data ?? [])
    .map((c) => `  - ${c.first_name} ${c.last_name} (${c.email ?? 'pas d\'email'}) — ${c.company ?? 'pas d\'entreprise'}`)
    .join('\n')

  const todayTasks = (tasksRes.data ?? [])
    .map((t) => `  - [${t.priority === 3 ? 'URGENT' : t.priority === 2 ? 'HAUTE' : 'NORMALE'}] ${t.title}`)
    .join('\n')

  return `
CONTEXTE CRM DE L'UTILISATEUR (données en temps réel):
═══════════════════════════════════════════════════

📇 CONTACTS: ${totalContacts ?? 0} au total
Derniers ajoutés:
${recentContacts || '  Aucun contact'}

💰 DEALS: ${deals.length} deals actifs — Valeur totale: ${totalDealValue.toLocaleString('fr-FR')} DA
Par étape:
${stagesSummary || '  Aucun deal'}

✅ TÂCHES DU JOUR: ${(tasksRes.data ?? []).length} tâches
${todayTasks || '  Aucune tâche pour aujourd\'hui'}

📊 ACTIVITÉ RÉCENTE:
${(activityRes.data ?? []).map((c) => `  - Nouveau contact: ${c.first_name} ${c.last_name}`).join('\n') || '  Pas d\'activité récente'}
`.trim()
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // Validate auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Check daily usage limit
    const today = new Date().toISOString().split('T')[0]
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('request_count')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    const currentCount = usage?.request_count ?? 0

    if (currentCount >= DAILY_REQUEST_LIMIT) {
      return Response.json(
        {
          error: 'Limite quotidienne atteinte',
          limit: DAILY_REQUEST_LIMIT,
          used: currentCount,
          upgradeUrl: '/dashboard/settings/billing',
        },
        { status: 429 }
      )
    }

    // Parse request
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages requis' }, { status: 400 })
    }

    // Fetch CRM context
    const crmContext = await getCRMContext(supabase, user.id)

    const systemPrompt = `Tu es l'assistant IA de GetAgenzia, un CRM intelligent pour les équipes commerciales.

RÔLE: Tu aides les commerciaux à analyser leur pipeline, rédiger des emails, identifier les risques et optimiser leurs ventes.

STYLE:
- Réponds toujours en français
- Sois concis et actionnable
- Utilise des emojis pertinents pour la lisibilité
- Structure tes réponses avec des titres et listes
- Quand tu recommandes une action, ajoute un lien d'action entre crochets:
  [Voir les deals →](/dashboard/deals)
  [Envoyer l'email →](/dashboard/gmail)
  [Créer une tâche →](/dashboard/tasks)
  [Voir les contacts →](/dashboard/contacts)

${crmContext}

DATE ACTUELLE: ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

INSTRUCTIONS:
- Base tes analyses UNIQUEMENT sur les données CRM fournies ci-dessus
- Si on te demande des données que tu n'as pas, dis-le clairement
- Propose des actions concrètes avec les liens appropriés
- Pour les emails, rédige en français professionnel
- Pour les rapports, utilise un format structuré avec des chiffres clés`

    // Increment usage (fire and forget via Supabase RPC)
    supabase.rpc('increment_ai_usage', {
      p_user_id: user.id,
      p_tokens: 0,
    }).then(() => {})

    // Stream the response
    const result = streamText({
      model: gateway.chatModel('anthropic/claude-haiku-4.5'),
      system: systemPrompt,
      messages,
      maxTokens: 1024,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return Response.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
