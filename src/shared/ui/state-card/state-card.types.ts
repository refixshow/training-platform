import type { ReactNode } from 'react'

export type StateCardLayout = 'center' | 'inline'
export type StateCardTone = 'accent' | 'danger' | 'neutral'

export interface StateCardProps {
  action?: ReactNode
  children: ReactNode
  icon: ReactNode
  layout?: StateCardLayout
  title: string
  tone?: StateCardTone
}
