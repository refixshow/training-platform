import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> {
  children: ReactNode
  size?: ButtonSize
  variant?: ButtonVariant
}
