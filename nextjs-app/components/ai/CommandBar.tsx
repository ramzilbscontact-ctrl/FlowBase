'use client'

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { useChat } from 'ai/react'
import { createClient } from '@/lib/supabase/client'

const DAILY_LIMIT = 50

const SUGGESTED_PROMPTS = [
  { emoji: '\ud83d\udcca', text: 'R\u00e9sume mon pipeline cette semaine' },
  { emoji: '\ud83d\udce7', text: 'R\u00e9dige un follow-up pour un prospect' },
  { emoji: '\ud83c\udfaf', text: 'Quels deals risquent de churn ?' },
  { emoji: '\ud83d\udccb', text: 'Cr\u00e9e un rapport hebdomadaire' },
]

interface CommandBarProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const [usageCount, setUsageCount] = useState<number | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: chatSubmit,
    isLoading,
    setMessages,
    setInput,
    error,
  } = useChat({
    api: '/api/ai/chat',
    onError: (err) => {
      if (err.message?.includes('429') || err.message?.includes('Limite')) {
        setLimitReached(true)
      }
    },
    onFinish: () => {
      fetchUsage()
    },
  })

  // Fetch current usage
  const fetchUsage = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('ai_usage')
        .select('request_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      const count = data?.request_count ?? 0
      setUsageCount(count)
      setLimitReached(count >= DAILY_LIMIT)
    } catch {
      // Silently fail - usage display is non-critical
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchUsage()
      // Focus input after animation
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, fetchUsage])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  function handlePromptClick(prompt: string) {
    setInput(prompt)
    // Submit directly
    const fakeEvent = {
      preventDefault: () => {},
    } as FormEvent<HTMLFormElement>
    setInput(prompt)
    // We need to use a timeout so the input state updates
    setTimeout(() => {
      inputRef.current?.form?.requestSubmit()
    }, 50)
  }

  function handleReset() {
    setMessages([])
    setInput('')
    setLimitReached(false)
    inputRef.current?.focus()
  }

  if (!isOpen) return null

  const remaining = usageCount !== null ? DAILY_LIMIT - usageCount : null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      style={{ animation: 'fadeIn 150ms ease-out' }}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{
          maxHeight: '70vh',
          animation: 'slideUp 200ms ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-500 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span className="text-sm font-semibold text-gray-800">
              GetAgenzia AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            {remaining !== null && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  remaining <= 5
                    ? 'bg-red-50 text-red-600'
                    : remaining <= 15
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {remaining} / {DAILY_LIMIT} restants
              </span>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-50 rounded border border-gray-200">
              ESC
            </kbd>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.length === 0 && !limitReached && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                Que puis-je faire pour vous ?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => handlePromptClick(prompt.text)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl border border-gray-100 hover:border-indigo-200 transition-all duration-150"
                  >
                    <span className="text-base">{prompt.emoji}</span>
                    <span>{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {limitReached && messages.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <div className="text-3xl">
                \u26a1
              </div>
              <p className="text-sm font-medium text-gray-800">
                Limite quotidienne atteinte
              </p>
              <p className="text-xs text-gray-500">
                Vous avez utilis\u00e9 vos {DAILY_LIMIT} requ\u00eates du jour.
                <br />
                Revenez demain ou passez au plan Pro.
              </p>
              <a
                href="/dashboard/settings/billing"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Passer au Pro \u2192
              </a>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-50 text-gray-800 border border-gray-100'
                }`}
              >
                {message.role === 'assistant' ? (
                  <MarkdownContent content={message.content} />
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && !limitReached && (
            <div className="text-center py-4">
              <p className="text-sm text-red-500">
                Erreur: impossible de contacter l&apos;assistant. Veuillez r\u00e9essayer.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-100 px-4 py-3">
          <form
            onSubmit={chatSubmit}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={limitReached ? 'Limite atteinte...' : 'Demandez quelque chose...'}
              disabled={limitReached || isLoading}
              className="flex-1 px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                title="Nouvelle conversation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || limitReached || isLoading}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] text-gray-400">
              \u2318K pour ouvrir \u00b7 ESC pour fermer
            </span>
            <span className="text-[10px] text-gray-400">
              Propuls\u00e9 par GetAgenzia AI
            </span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

// Simple Markdown renderer for AI responses
function MarkdownContent({ content }: { content: string }) {
  // Parse action links: [Text →](/path)
  // Parse bold: **text**
  // Parse lists: - item
  // Parse headings: ## heading

  const lines = content.split('\n')

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Empty line
        if (line.trim() === '') return <div key={i} className="h-1" />

        // Heading
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="font-semibold text-gray-900 mt-2">
              {renderInline(line.slice(3))}
            </h3>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <h4 key={i} className="font-medium text-gray-800 mt-1.5">
              {renderInline(line.slice(4))}
            </h4>
          )
        }

        // List item
        if (line.match(/^\s*[-*]\s/)) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="text-indigo-400 shrink-0 mt-0.5">\u2022</span>
              <span>{renderInline(line.replace(/^\s*[-*]\s/, ''))}</span>
            </div>
          )
        }

        // Numbered list
        if (line.match(/^\s*\d+\.\s/)) {
          const num = line.match(/^\s*(\d+)\.\s/)?.[1]
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="text-indigo-500 font-medium shrink-0 mt-0.5 text-xs w-4 text-right">{num}.</span>
              <span>{renderInline(line.replace(/^\s*\d+\.\s/, ''))}</span>
            </div>
          )
        }

        // Regular paragraph
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Action link: [Text →](/path)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch && linkMatch.index !== undefined) {
      // Text before the link
      if (linkMatch.index > 0) {
        parts.push(
          <span key={key++}>
            {renderBold(remaining.slice(0, linkMatch.index))}
          </span>
        )
      }

      const isActionLink = linkMatch[1].includes('\u2192')
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          className={
            isActionLink
              ? 'inline-flex items-center gap-1 px-2.5 py-1 mt-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-colors'
              : 'text-indigo-600 hover:text-indigo-700 underline decoration-indigo-200'
          }
        >
          {linkMatch[1]}
        </a>
      )

      remaining = remaining.slice(linkMatch.index + linkMatch[0].length)
      continue
    }

    // No more special patterns
    parts.push(<span key={key++}>{renderBold(remaining)}</span>)
    break
  }

  return parts
}

function renderBold(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const boldRegex = /\*\*([^*]+)\*\*/g
  let lastIndex = 0
  let match

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <strong key={match.index} className="font-semibold text-gray-900">
        {match[1]}
      </strong>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}
