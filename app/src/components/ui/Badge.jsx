import { cn } from '../../utils/helpers'
import { getStatusColor, getStatusLabel } from '../../utils/helpers'

export function Badge({ className, children, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-bl-sand/20 text-bl-sandDark',
    reading: 'badge-reading',
    pending: 'badge-pending',
    completed: 'badge-completed',
    paused: 'badge-paused',
    dropped: 'badge-dropped',
    reReading: 'badge-re-reading',
    rose: 'bg-bl-rose/10 text-bl-roseDark',
    sage: 'bg-bl-sage/10 text-bl-sageDark',
    butter: 'bg-[#EEEFE8] text-[#8A7A6A] border border-[#C9B297]/20',
  }

  return (
    <span className={cn('badge', variants[variant], className)} {...props}>
      {children}
    </span>
  )
}

export function StatusBadge({ status, className, ...props }) {
  const safeStatus = status || 'PENDIENTE'

  return (
    <Badge variant={safeStatus.toLowerCase()} className={className} {...props}>
      {getStatusLabel(safeStatus)}
    </Badge>
  )
}

export function GenreBadge({ children, className, ...props }) {
  return (
    <Badge variant="default" className={cn('text-xs px-2 py-0.5', className)} {...props}>
      {children}
    </Badge>
  )
}