import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return <div className={cn('card', className)} {...props}>{children}</div>
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return <div className={cn('card-header', className)} {...props}>{children}</div>
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return <h3 className={cn('card-title', className)} {...props}>{children}</h3>
}

export interface CardSubtitleProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export function CardSubtitle({ className, children, ...props }: CardSubtitleProps) {
  return <p className={cn('card-subtitle', className)} {...props}>{children}</p>
}
