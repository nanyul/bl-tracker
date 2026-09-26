import { forwardRef } from 'react'
import { cn } from '../../utils/helpers'

export const Card = forwardRef(function Card({ className, children, hover = true, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('card', hover && 'card-hover', className)}
      {...props}
    >
      {children}
    </div>
  )
})

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-b border-bl-sand/20', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-t border-bl-sand/20 bg-bl-cream/50', className)} {...props}>
      {children}
    </div>
  )
}

Card.displayName = 'Card'