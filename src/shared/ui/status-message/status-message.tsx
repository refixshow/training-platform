import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from 'lucide-react'

import {
  statusMessageIconVariants,
  statusMessageVariants,
} from './status-message.variants'
import type { StatusMessageProps, StatusMessageTone } from './status-message.types'

export function StatusMessage({
  children,
  size = 'sm',
  tone,
  ...props
}: StatusMessageProps) {
  const Icon = getStatusMessageIcon(tone)

  return (
    <p className={statusMessageVariants({ size, tone })} {...props}>
      <Icon
        aria-hidden="true"
        className={statusMessageIconVariants({ size })}
      />
      <span>{children}</span>
    </p>
  )
}

function getStatusMessageIcon(tone: StatusMessageTone) {
  if (tone === 'success') return CheckCircle2
  if (tone === 'warning') return TriangleAlert
  if (tone === 'info') return Info
  return AlertCircle
}
