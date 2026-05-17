import { useMemo, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, Lock, Plus, Scale } from 'lucide-react'

import {
  formatMetricValue,
  getMetricDef,
  getMetricFillStats,
  getMetricValue,
  getTrendDirection,
  metricDefinitions,
  selectDefaultMetric,
  type MetricKey,
  type TrendDirection,
} from '#/entities/body-measurement'

import { BodyMeasurementChart, type ChartPoint } from './body-measurement-chart'
import { BodyMeasurementMetricList } from './body-measurement-metric-list'
import {
  BodyMeasurementTimeline,
  type TimelineEntry,
} from './body-measurement-timeline'

export interface BodyMeasurementEntry extends TimelineEntry {}

interface BaseProps {
  entries: readonly BodyMeasurementEntry[]
  isLoading?: boolean
  error?: Error | null
  variant: 'trainee' | 'coach'
  traineeName?: string
}

interface TraineeProps extends BaseProps {
  variant: 'trainee'
  onAdd: () => void
  onEdit?: (entryId: string) => void
  onDelete?: (entryId: string) => void
}

interface CoachProps extends BaseProps {
  variant: 'coach'
  onAdd?: never
  onEdit?: never
  onDelete?: never
}

type Props = TraineeProps | CoachProps

export function BodyMeasurementHistory(props: Props) {
  if (props.error) {
    return <ErrorState error={props.error} />
  }

  if (props.isLoading) {
    return <HistorySkeleton />
  }

  if (props.entries.length === 0) {
    return <EmptyState variant={props.variant} onAdd={props.variant === 'trainee' ? props.onAdd : undefined} traineeName={props.traineeName} />
  }

  return <HistoryContent {...props} />
}

function HistoryContent(props: Props) {
  const fillStats = useMemo(
    () => getMetricFillStats(props.entries.map((entry) => entry.values)),
    [props.entries],
  )

  const [activeMetric, setActiveMetric] = useState<MetricKey>(() =>
    selectDefaultMetric(props.entries.map((entry) => entry.values)),
  )

  const definition = getMetricDef(activeMetric)
  const sorted = useMemo(
    () => [...props.entries].sort((a, b) => a.capturedAt - b.capturedAt),
    [props.entries],
  )

  const points: ChartPoint[] = useMemo(
    () =>
      sorted
        .map((entry) => {
          const value = getMetricValue(entry.values, activeMetric)
          if (value === null) return null
          return { capturedAt: entry.capturedAt, value }
        })
        .filter((point): point is ChartPoint => point !== null),
    [sorted, activeMetric],
  )

  const latest = points[points.length - 1] ?? null
  const previous = points[points.length - 2] ?? null
  const trend: TrendDirection = getTrendDirection(previous?.value, latest?.value)
  const delta =
    latest && previous ? latest.value - previous.value : null

  const fillCount = fillStats.find((stat) => stat.metric === activeMetric)?.filled ?? 0
  const isMetricEmpty = fillCount === 0
  const isLeanMass = activeMetric === 'leanBodyMassKg'

  return (
    <section className="grid gap-7 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <aside className="grid gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-6 lg:pr-2">
        <ScrollableMetricChips
          activeMetric={activeMetric}
          fillStats={fillStats}
          onSelect={setActiveMetric}
        />
        <div className="hidden lg:block">
          <BodyMeasurementMetricList
            activeMetric={activeMetric}
            fillStats={fillStats}
            isEmpty={false}
            onSelect={setActiveMetric}
          />
        </div>
      </aside>

      <div className="grid min-w-0 gap-6 lg:border-l lg:border-border lg:pl-10">
        <header className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {props.variant === 'coach' ? `Klienci / ${props.traineeName ?? 'Klient'} / Pomiary` : 'Postepy / Pomiary'}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Pomiary
              </h1>
            </div>
            {props.variant === 'trainee' ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-150 ease-out hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
                onClick={props.onAdd}
                type="button"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Dodaj pomiar
              </button>
            ) : (
              <p className="inline-flex h-11 items-center rounded-md border border-dashed border-border px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Widok klienta · tylko odczyt
              </p>
            )}
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-semibold text-muted-foreground">{definition.label}</p>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <p className="text-5xl font-semibold tracking-tight text-foreground tabular-nums">
                {latest ? formatMetricValue(activeMetric, latest.value) : <span className="text-muted-foreground">—</span>}
              </p>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {latest
                    ? `Ostatni pomiar · ${formatShortDate(latest.capturedAt)}`
                    : isLeanMass
                      ? 'Brak danych do wyliczenia'
                      : 'Brak pomiarow dla tej metryki'}
                </p>
                <TrendBadge delta={delta} metric={activeMetric} trend={trend} />
              </div>
            </div>
          </div>
        </header>

        {isMetricEmpty ? (
          <MetricEmptyState
            isLeanMass={isLeanMass}
            metric={activeMetric}
            onSelect={setActiveMetric}
          />
        ) : (
          <BodyMeasurementChart metric={activeMetric} points={points} />
        )}

        <BodyMeasurementTimeline
          activeMetric={activeMetric}
          canEdit={props.variant === 'trainee'}
          entries={props.entries}
          highlightMissing={isMetricEmpty}
          onDelete={props.variant === 'trainee' ? props.onDelete : undefined}
          onEdit={props.variant === 'trainee' ? props.onEdit : undefined}
        />
      </div>
    </section>
  )
}

function ScrollableMetricChips({
  activeMetric,
  fillStats,
  onSelect,
}: {
  activeMetric: MetricKey
  fillStats: ReturnType<typeof getMetricFillStats>
  onSelect: (metric: MetricKey) => void
}) {
  const fillByMetric = new Map(fillStats.map((stat) => [stat.metric, stat.filled]))

  return (
    <nav
      aria-label="Wybierz metryke"
      className="-mx-4 overflow-x-auto px-4 lg:hidden"
    >
      <ul className="flex gap-2">
        {metricDefinitions.map((metric) => {
          const isActive = metric.key === activeMetric
          const count = fillByMetric.get(metric.key) ?? 0

          return (
            <li key={metric.key}>
              <button
                aria-current={isActive ? 'true' : undefined}
                className={
                  isActive
                    ? 'inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-foreground px-3 text-xs font-bold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    : 'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                }
                onClick={() => onSelect(metric.key)}
                type="button"
              >
                {metric.shortLabel}
                <span
                  className={
                    isActive
                      ? 'rounded-full bg-background/15 px-1.5 text-[10px] tabular-nums'
                      : 'rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground'
                  }
                >
                  {count}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function TrendBadge({
  delta,
  metric,
  trend,
}: {
  delta: number | null
  metric: MetricKey
  trend: TrendDirection
}) {
  if (trend === 'none' || delta === null) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        pierwszy pomiar
      </p>
    )
  }

  const definition = getMetricDef(metric)
  const formatted = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(delta))

  if (trend === 'flat') {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        Bez zmian vs poprzedni
      </p>
    )
  }

  const Icon = trend === 'down' ? ArrowDown : ArrowUp
  const sign = delta > 0 ? '+' : '−'

  return (
    <p className="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-primary">
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {sign}
      {formatted} {definition.unit} vs poprzedni
    </p>
  )
}

function MetricEmptyState({
  isLeanMass,
  metric,
  onSelect,
}: {
  isLeanMass: boolean
  metric: MetricKey
  onSelect: (metric: MetricKey) => void
}) {
  const definition = getMetricDef(metric)
  const suggestions = metricDefinitions
    .filter(
      (candidate) => candidate.key !== metric && !candidate.derived,
    )
    .slice(0, 3)

  return (
    <div className="grid min-h-[14rem] place-items-center rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Brak danych dla metryki „{definition.label}"
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {isLeanMass
            ? 'Uzupelnij wage i % tluszczu w jednym pomiarze, zeby zobaczyc trend.'
            : 'Sprobuj wybrac metryke, ktorej uzywasz czesciej:'}
        </p>
        {!isLeanMass ? (
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {suggestions.map((candidate) => (
              <li key={candidate.key}>
                <button
                  className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => onSelect(candidate.key)}
                  type="button"
                >
                  {candidate.shortLabel}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

function EmptyState({
  onAdd,
  traineeName,
  variant,
}: {
  onAdd?: () => void
  traineeName?: string
  variant: 'trainee' | 'coach'
}) {
  return (
    <section className="grid place-items-center px-4 py-16">
      <div className="grid max-w-md gap-4 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Scale aria-hidden="true" className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {variant === 'trainee' ? 'Brak pomiarow' : 'Klient nie dodal jeszcze pomiarow'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {variant === 'trainee'
              ? 'Dodaj pierwszy wpis, zeby zaczac sledzic postep.'
              : traineeName
                ? `Zostanie tutaj pokazane gdy ${traineeName} wprowadzi pierwsze dane.`
                : 'Zostanie tutaj pokazane gdy klient wprowadzi pierwsze dane.'}
          </p>
        </div>
        {variant === 'trainee' && onAdd ? (
          <button
            className="mx-auto inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-150 ease-out hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
            onClick={onAdd}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Dodaj pierwszy pomiar
          </button>
        ) : null}
      </div>
    </section>
  )
}

function ErrorState({ error }: { error: Error }) {
  const isAccess = error.message.toLocaleLowerCase('pl-PL').includes('dostep')

  return (
    <section className="grid min-h-[40vh] place-items-center px-4 py-8">
      <div className="grid max-w-md gap-3 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-destructive">
          {isAccess ? (
            <Lock aria-hidden="true" className="h-6 w-6" />
          ) : (
            <AlertCircle aria-hidden="true" className="h-6 w-6" />
          )}
        </span>
        <h1 className="text-xl font-bold text-foreground">
          {isAccess ? 'Brak dostepu do tego klienta' : 'Nie udalo sie pobrac pomiarow'}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {isAccess
            ? 'Nie mozesz przegladac pomiarow tego klienta. Wroc do listy klientow.'
            : error.message}
        </p>
      </div>
    </section>
  )
}

function HistorySkeleton() {
  return (
    <section className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div className="grid gap-3">
        <div className="h-3 w-24 rounded-md bg-muted" />
        <div className="grid gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="h-7 rounded-md bg-muted/60" key={index} />
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:border-l lg:border-border lg:pl-10">
        <div className="h-3 w-32 rounded-md bg-muted" />
        <div className="h-10 max-w-md rounded-md bg-muted" />
        <div className="h-12 max-w-sm rounded-md bg-muted/70" />
        <div className="h-60 rounded-md bg-card" />
        <div className="grid gap-3">
          <div className="h-10 rounded-md bg-card" />
          <div className="h-10 rounded-md bg-card" />
          <div className="h-10 rounded-md bg-card" />
        </div>
      </div>
    </section>
  )
}

function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'long',
  }).format(timestamp)
}
