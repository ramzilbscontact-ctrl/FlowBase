import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  className?: string
  size?: number
  withText?: boolean
  dark?: boolean
}

/**
 * GetAgenzia "fb." logo — uses the original brand image directly.
 */
export function Logo({ className, size = 32, withText = false, dark = false }: LogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/logo.png"
        alt="GetAgenzia"
        width={size}
        height={size}
        className={cn(
          'rounded-lg object-contain',
          dark && 'brightness-0 invert' // White version on dark backgrounds
        )}
        priority
      />
      {withText && (
        <span className={cn(
          'font-bold text-lg tracking-tight',
          dark ? 'text-white' : 'text-slate-900'
        )}>
          Get<span className={dark ? 'text-indigo-400' : 'text-indigo-600'}>Agenzia</span>
        </span>
      )}
    </div>
  )
}
