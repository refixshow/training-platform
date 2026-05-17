import { cva } from 'class-variance-authority'

export const statusMessageVariants = cva('flex items-start gap-2 font-medium', {
  defaultVariants: {
    size: 'sm',
  },
  variants: {
    size: {
      md: 'text-sm leading-6',
      sm: 'text-xs leading-5',
    },
    tone: {
      error: 'text-destructive',
      info: 'text-muted-foreground',
      success: 'text-accent-foreground',
      warning: 'text-primary',
    },
  },
})

export const statusMessageIconVariants = cva('mt-0.5 shrink-0', {
  defaultVariants: {
    size: 'sm',
  },
  variants: {
    size: {
      md: 'h-4 w-4',
      sm: 'h-3.5 w-3.5',
    },
  },
})
