'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare } from 'lucide-react'
import { WidgetSkeleton } from './WidgetCard'

const supabase = createClient()

export function UrgentTasks() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['dashboard', 'urgent-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority')
        .eq('completed', false)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5)
      return (data ?? []) as { id: string; title: string; due_date: string | null; priority: string }[]
    },
  })

  if (isLoading) return <WidgetSkeleton height={200} />

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <CheckSquare className="h-8 w-8 mb-2" />
        <p className="text-sm">Aucune tache urgente</p>
      </div>
    )
  }

  const today = new Date()

  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const isOverdue = t.due_date && new Date(t.due_date) < today
        return (
          <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-red-500' : t.priority === 'high' ? 'bg-orange-400' : 'bg-blue-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700 truncate">{t.title}</p>
            </div>
            {t.due_date && (
              <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {new Date(t.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
