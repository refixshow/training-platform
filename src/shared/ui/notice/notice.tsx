import { noticeVariants } from './notice.variants'
import type { NoticeProps } from './notice.types'

export function Notice({ children, tone = 'info', ...props }: NoticeProps) {
  const isError = tone === 'error'

  return (
    <div
      aria-live={isError ? 'assertive' : 'polite'}
      className={noticeVariants({ tone })}
      role={isError ? 'alert' : 'status'}
      {...props}
    >
      {children}
    </div>
  )
}
