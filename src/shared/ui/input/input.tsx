import { inputVariants, textareaVariants } from './input.variants'
import type { InputProps, SelectProps, TextareaProps } from './input.types'

export function Input({
  density = 'default',
  leadingIcon,
  ...props
}: InputProps) {
  if (!leadingIcon) {
    return <input className={inputVariants({ density })} {...props} />
  }

  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {leadingIcon}
      </span>
      <input
        className={inputVariants({ density, hasLeadingIcon: true })}
        {...props}
      />
    </span>
  )
}

export function Select({ density = 'default', ...props }: SelectProps) {
  return <select className={inputVariants({ density })} {...props} />
}

export function Textarea({ size = 'default', ...props }: TextareaProps) {
  return <textarea className={textareaVariants({ size })} {...props} />
}
