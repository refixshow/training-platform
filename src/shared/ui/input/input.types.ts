import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export type InputDensity = 'compact' | 'default'

export type TextareaSize = 'default' | 'tall'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style'> {
  density?: InputDensity
  leadingIcon?: ReactNode
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'style'> {
  density?: InputDensity
}

export interface TextareaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'className' | 'style'
  > {
  size?: TextareaSize
}
