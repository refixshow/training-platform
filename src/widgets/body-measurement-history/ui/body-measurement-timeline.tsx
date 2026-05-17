import { ArrowDown, ArrowRight, ArrowUp, Pencil, Trash2 } from 'lucide-react'

import {
  formatMetricValue,
  getMetricDef,
  getMetricValue,
  getTrendDirection,
  isToday,
  type MetricKey,
  type TrendDirection,
} from '#/entities/body-measurement'

export interface TimelineEntry {
  _id: string
  capturedAt: number
  note?: string
  photoUrl?: string | null
  values: {
    bodyWeightKg?: number
    bodyFatPercent?: number
    neckCm?: number
    shoulderCm?: number
    chestCm?: number
    abdomenCm?: number
    waistCm?: number
    hipsCm?: number
    leftBicepCm?: number
    rightBicepCm?: number
    leftForearmCm?: number
    rightForearmCm?: number
    leftThighCm?: number
    rightThighCm?: number
    leftCalfCm?: number
    rightCalfCm?: number
  }
}

interface TimelineProps {
  activeMetric: MetricKey
  entries: readonly TimelineEntry[]
  canEdit: boolean
  onEdit?: (entryId: string) => void
  onDelete?: (entryId: string) => void
  highlightMissing?: boolean
}

export function BodyMeasurementTimeline({
  activeMetric,
  entries,
  canEdit,
  onDelete,
  onEdit,
  highlightMissing = false,
}: TimelineProps) {
  if (entries.length === 0) {
    return null
  }

  const sortedEntries = [...entries].sort((a, b) => b.capturedAt - a.capturedAt)

  return (
    <section aria-label="Historia pomiarow" className="grid">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Historia
      </h2>
      <ol className="mt-3 grid">
        {sortedEntries.map((entry, index) => {
          const nextEntry = sortedEntries[index + 1]
          const currentValue = getMetricValue(entry.values, activeMetric)
          const previousValue = nextEntry
            ? getMetricValue(nextEntry.values, activeMetric)
            : null
          const trend = getTrendDirection(previousValue, currentValue)
          const editable = canEdit && isToday(entry.capturedAt)
          const hasMetric = currentValue !== null
          const dim = highlightMissing && !hasMetric

          return (
            <li
              className="border-b border-border last:border-b-0"
              key={entry._id}
            >
              <article
                className={
                  dim
                    ? 'flex items-center gap-3 py-3 opacity-55 transition-opacity'
                    : 'flex items-center gap-3 py-3'
                }
              >
                <TrendIcon direction={trend} />
                <div className="min-w-0 grow">
                  <div className="flex items-baseline gap-2">
                    <p className="text-base font-bold tabular-nums text-foreground">
                      {hasMetric
                        ? formatMetricValue(activeMetric, currentValue)
                        : '—'}
                    </p>
                    <DeltaLabel metric={activeMetric} previous={previousValue} current={currentValue} />
                  </div>
                  {entry.note ? (
                    <p className="mt-0.5 truncate text-xs leading-5 text-muted-foreground">
                      {entry.note}
                    </p>
                  ) : null}
                </div>
                {entry.photoUrl ? (
                  <img
                    alt={`Zdjecie z ${formatLongDate(entry.capturedAt)}`}
                    className="h-9 w-9 shrink-0 rounded-sm border border-border object-cover"
                    loading="lazy"
                    src={entry.photoUrl}
                  />
                ) : null}
                <p className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {formatShortDate(entry.capturedAt)}
                </p>
                {canEdit ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <RowAction
                      ariaLabel="Edytuj pomiar"
                      disabled={!editable}
                      icon={Pencil}
                      onClick={() => onEdit?.(entry._id)}
                      title={editable ? 'Edytuj pomiar' : 'Pomiary starsze niz dzis sa tylko do odczytu'}
                    />
                    <RowAction
                      ariaLabel="Usun pomiar"
                      disabled={!editable}
                      icon={Trash2}
                      onClick={() => onDelete?.(entry._id)}
                      title={editable ? 'Usun pomiar' : 'Pomiary starsze niz dzis sa tylko do odczytu'}
                    />
                  </div>
                ) : null}
              </article>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function DeltaLabel({
  metric,
  previous,
  current,
}: {
  metric: MetricKey
  previous: number | null
  current: number | null
}) {
  if (current === null) return null

  if (previous === null) {
    return (
      <span className="text-xs font-semibold text-muted-foreground">
        pierwszy pomiar
      </span>
    )
  }

  const delta = current - previous

  if (Math.abs(delta) < 0.05) {
    return (
      <span className="text-xs font-semibold text-muted-foreground">
        bez zmian
      </span>
    )
  }

  const definition = getMetricDef(metric)
  const sign = delta > 0 ? '+' : '−'
  const value = new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(delta))

  return (
    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
      {sign}
      {value} {definition.unit}
    </span>
  )
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <ArrowUp aria-label="Wartosc wzrosla" className="h-4 w-4" />
      </span>
    )
  }

  if (direction === 'down') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <ArrowDown aria-label="Wartosc spadla" className="h-4 w-4" />
      </span>
    )
  }

  if (direction === 'flat') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ArrowRight aria-label="Wartosc bez zmian" className="h-4 w-4" />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
    >
      <ArrowRight className="h-4 w-4 rotate-45 opacity-50" />
    </span>
  )
}

interface RowActionProps {
  ariaLabel: string
  disabled: boolean
  icon: typeof Pencil
  onClick: () => void
  title: string
}

function RowAction({ ariaLabel, disabled, icon: Icon, onClick, title }: RowActionProps) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  )
}

function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
  }).format(timestamp)
}

function formatLongDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(timestamp)
}
