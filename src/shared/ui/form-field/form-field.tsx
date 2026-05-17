import { StatusMessage } from '#/shared/ui/status-message'

import type { FieldErrorProps, FormFieldProps } from './form-field.types'

export function FormField({
  children,
  density = 'default',
  error,
  hint,
  label,
  name,
  ...props
}: FormFieldProps) {
  return (
    <div className={density === 'compact' ? 'grid gap-1.5' : 'grid gap-2'} {...props}>
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs leading-5 text-muted-foreground" id={`${name}-hint`}>
          {hint}
        </p>
      ) : null}
      <FieldError error={error} id={`${name}-error`} />
    </div>
  )
}

export function FieldError({ error, id }: FieldErrorProps) {
  if (!error) {
    return null
  }

  return (
    <StatusMessage id={id} size="sm" tone="error">
      {error}
    </StatusMessage>
  )
}
