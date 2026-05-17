import type { HTMLAttributes, ReactNode } from 'react'

export type FormFieldDensity = 'compact' | 'default'

export interface FormFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  children: ReactNode
  density?: FormFieldDensity
  error?: string
  hint?: ReactNode
  label: string
  name: string
}

export interface FieldErrorProps {
  error?: string
  id: string
}

export interface FieldA11yOptions {
  hasHint?: boolean
}
