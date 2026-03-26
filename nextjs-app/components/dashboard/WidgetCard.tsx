import type { ReactNode } from 'react'
import Link from 'next/link'
import { LiveIndicator } from './LiveIndicator'

interface WidgetCardProps {
  title: string
  linkHref?: string
  linkLabel?: string
  children: ReactNode
  className?: string
  muted?: boolean
}

export function WidgetCard({ title, linkHref, linkLabel = 'Voir tout', children, className = '', muted }: WidgetCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex items-center gap-3">
          {!muted && <LiveIndicator />}
          {linkHref && (
            <Link href={linkHref} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              {linkLabel} &rarr;
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

export function WidgetSkeleton({ height = 200 }: { height?: number }) {
  return <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height }} />
}
