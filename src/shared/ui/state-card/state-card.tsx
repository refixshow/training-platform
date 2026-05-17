import { Card, CardBody } from '#/shared/ui/card'

import type {
  StateCardLayout,
  StateCardProps,
  StateCardTone,
} from './state-card.types'

export function StateCard({
  action,
  children,
  icon,
  layout = 'inline',
  title,
  tone = 'accent',
}: StateCardProps) {
  return (
    <Card>
      <CardBody padding="lg">
        <div className={getFrameClass(layout)}>
          <div className={getIconClass(tone)}>{icon}</div>
          <div>
            <h2 className={layout === 'center' ? 'mt-5 text-xl font-bold text-foreground' : 'text-lg font-bold text-foreground'}>
              {title}
            </h2>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">
              {children}
            </div>
            {action ? <div className="mt-5">{action}</div> : null}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function getFrameClass(layout: StateCardLayout) {
  if (layout === 'center') {
    return 'grid min-h-64 place-items-center text-center'
  }

  return 'flex max-w-2xl items-start gap-3'
}

function getIconClass(tone: StateCardTone) {
  const base =
    'flex shrink-0 items-center justify-center rounded-md [&>svg]:h-5 [&>svg]:w-5'

  if (tone === 'danger') {
    return `${base} h-10 w-10 bg-muted text-destructive`
  }

  if (tone === 'neutral') {
    return `${base} h-10 w-10 bg-muted text-foreground`
  }

  return `${base} h-10 w-10 bg-accent text-accent-foreground`
}
