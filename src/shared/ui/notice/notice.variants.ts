import { cva } from 'class-variance-authority'

export const noticeVariants = cva('rounded-md border p-4 text-sm font-medium', {
  defaultVariants: {
    tone: 'info',
  },
  variants: {
    tone: {
      error: 'border-destructive/30 bg-card text-destructive',
      info: 'border-border bg-muted text-foreground',
      neutral: 'border-border bg-card text-foreground',
      success: 'border-border bg-accent text-accent-foreground',
    },
  },
})
