import { buttonVariants } from './button.variants'
import type { ButtonProps } from './button.types'

export function Button({
  children,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button className={buttonVariants({ size, variant })} type={type} {...props}>
      {children}
    </button>
  )
}
