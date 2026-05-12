import { cva } from 'class-variance-authority'

export const cardVariants = cva('rounded-lg border border-border bg-card', {
  defaultVariants: {
    padding: 'none',
  },
  variants: {
    padding: {
      none: '',
      md: 'p-4 sm:p-5',
      lg: 'p-5 sm:p-6',
    },
  },
})

export const cardHeaderVariants = cva('flex flex-col gap-2 border-b border-border', {
  defaultVariants: {
    padding: 'md',
  },
  variants: {
    padding: {
      md: 'px-4 py-4 sm:px-5',
      lg: 'px-5 py-5 sm:px-6',
    },
  },
})

export const cardBodyVariants = cva('', {
  defaultVariants: {
    padding: 'md',
  },
  variants: {
    padding: {
      none: '',
      md: 'p-4 sm:p-5',
      lg: 'p-5 sm:p-6',
    },
  },
})

export const cardFooterVariants = cva(
  'flex flex-col gap-3 border-t border-border sm:flex-row sm:items-center sm:justify-between',
  {
    defaultVariants: {
      padding: 'md',
    },
    variants: {
      padding: {
        md: 'px-4 py-4 sm:px-5',
        lg: 'px-5 py-5 sm:px-6',
      },
    },
  },
)

export const cardNoticeVariants = cva('border-b border-border px-4 py-3 text-sm sm:px-5', {
  defaultVariants: {
    tone: 'info',
  },
  variants: {
    tone: {
      info: 'bg-accent text-accent-foreground',
      neutral: 'bg-muted text-foreground',
    },
  },
})
