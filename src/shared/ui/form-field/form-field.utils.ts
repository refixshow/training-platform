import type { FieldA11yOptions } from './form-field.types'

export function getFieldA11y(
  name: string,
  error?: string,
  options: boolean | FieldA11yOptions = {},
) {
  const hasHint =
    typeof options === 'boolean' ? options : (options.hasHint ?? false)
  const describedBy = [
    hasHint ? `${name}-hint` : undefined,
    error ? `${name}-error` : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : undefined,
  }
}
