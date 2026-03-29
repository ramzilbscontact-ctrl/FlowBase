'use client'

import type { FC } from 'react'
import type { LucideProps } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: number | string | null | undefined
  icon: FC<LucideProps>
  color?: 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'violet'
  hint?: string
  trend?: { value: number; label?: string } // e.g. { value: 12, label: 'vs mois dernier' }
}

type ColorKey = NonNullable<StatsCardProps['color']>

const colorMap: Record<
  ColorKey,
  { iconBg: string; iconColor: string; glow: string; gradient: string }
> = {
  blue:   { iconBg: 'bg-blue-500/10',   iconColor: 'text-blue-500',   glow: 'shadow-blue-500/10',   gradient: 'from-blue-500/5 to-transparent' },
  purple: { iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500', glow: 'shadow-purple-500/10', gradient: 'from-purple-500/5 to-transparent' },
  green:  { iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', glow: 'shadow-emerald-500/10', gradient: 'from-emerald-500/5 to-transparent' },
  yellow: { iconBg: 'bg-amber-500/10',  iconColor: 'text-amber-500',  glow: 'shadow-amber-500/10',  gradient: 'from-amber-500/5 to-transparent' },
  red:    { iconBg: 'bg-red-500/10',    iconColor: 'text-red-500',    glow: 'shadow-red-500/10',    gradient: 'from-red-500/5 to-transparent' },
  violet: { iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', glow: 'shadow-violet-500/10', gradient: 'from-violet-500/5 to-transparent' },
}

export function StatsCard({ label, value, icon: Icon, color = 'violet', hint, trend }: StatsCardProps) {
  const { iconBg, iconColor, glow, gradient } = colorMap[color]

  return (
    <div
      className={`relative overflow-hidden bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md ${glow} transition-all duration-300 group`}
    >
      {/* Subtle gradient bg */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${gradient} rounded-bl-[80px] pointer-events-none`} />

      <div className="relative flex items-start justify-between">
        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">
            {value == null ? (
              <span className="inline-block w-20 h-7 bg-gray-100 rounded-lg animate-pulse" />
            ) : value}
          </p>
          {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
          {trend && (
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-medium rounded-md px-1.5 py-0.5 ${
              trend.value >= 0
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-red-600 bg-red-50'
            }`}>
              {trend.value >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend.value)}%
              {trend.label && <span className="text-gray-400 ml-0.5">{trend.label}</span>}
            </div>
          )}
        </div>

        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}
