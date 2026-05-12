import type {
  FormHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react'

export type CardPadding = 'none' | 'md' | 'lg'
export type CardSectionPadding = 'md' | 'lg'

export type CardNoticeTone = 'info' | 'neutral'

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  children: ReactNode
  padding?: CardPadding
}

export interface CardSectionProps
  extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style'> {
  children: ReactNode
  padding?: CardSectionPadding
}

export interface CardFormProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'className' | 'style'> {
  children: ReactNode
  padding?: CardPadding
}

export interface CardNoticeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  children: ReactNode
  tone?: CardNoticeTone
}
