import { cva } from 'class-variance-authority'

export const inputVariants = cva(
  [
    'w-full rounded-md border border-input bg-card text-sm text-foreground shadow-none',
    'transition-colors placeholder:text-muted-foreground',
    'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25',
    'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
  ],
  {
    defaultVariants: {
      density: 'default',
    },
    variants: {
      density: {
        compact: 'h-10 px-3',
        default: 'h-11 px-3',
      },
      hasLeadingIcon: {
        false: '',
        true: 'pl-9',
      },
    },
  },
)

export const textareaVariants = cva(
  [
    'w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm leading-6 text-foreground shadow-none',
    'transition-colors placeholder:text-muted-foreground',
    'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25',
    'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
  ],
  {
    defaultVariants: {
      size: 'default',
    },
    variants: {
      size: {
        default: 'min-h-32',
        tall: 'min-h-48',
      },
    },
  },
)
