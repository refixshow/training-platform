import type { HTMLAttributes, ReactNode } from 'react'

export type NoticeTone = 'error' | 'info' | 'neutral' | 'success'

export interface NoticeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  children: ReactNode
  tone?: NoticeTone
}
