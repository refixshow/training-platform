import {
  metricDefinitions,
  metricGroupLabels,
  metricGroupOrder,
  type MetricFillStats,
  type MetricGroup,
  type MetricKey,
} from '#/entities/body-measurement'

interface BodyMeasurementMetricListProps {
  activeMetric: MetricKey
  fillStats: readonly MetricFillStats[]
  onSelect: (metric: MetricKey) => void
  isEmpty: boolean
}

export function BodyMeasurementMetricList({
  activeMetric,
  fillStats,
  isEmpty,
  onSelect,
}: BodyMeasurementMetricListProps) {
  const fillByMetric = new Map<MetricKey, number>()
  for (const stat of fillStats) {
    fillByMetric.set(stat.metric, stat.filled)
  }

  return (
    <nav
      aria-label="Lista metryk"
      className={isEmpty ? 'opacity-50' : undefined}
    >
      <ul className="grid gap-5">
        {metricGroupOrder.map((group) => (
          <MetricGroupSection
            activeMetric={activeMetric}
            fillByMetric={fillByMetric}
            group={group}
            key={group}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </nav>
  )
}

interface MetricGroupSectionProps {
  activeMetric: MetricKey
  fillByMetric: Map<MetricKey, number>
  group: MetricGroup
  onSelect: (metric: MetricKey) => void
}

function MetricGroupSection({
  activeMetric,
  fillByMetric,
  group,
  onSelect,
}: MetricGroupSectionProps) {
  const fields = metricDefinitions.filter((metric) => metric.group === group)

  if (fields.length === 0) return null

  return (
    <li>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {metricGroupLabels[group]}
      </p>
      <ul className="mt-2 grid border-t border-border">
        {fields.map((field) => {
          const isActive = activeMetric === field.key
          const count = fillByMetric.get(field.key) ?? 0

          return (
            <li className="border-b border-border" key={field.key}>
              <button
                aria-current={isActive ? 'true' : undefined}
                className={
                  isActive
                    ? 'flex w-full items-center justify-between gap-2 border-l-2 border-primary bg-muted/45 py-2.5 pl-3 pr-2 text-left text-sm font-bold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    : 'flex w-full items-center justify-between gap-2 border-l-2 border-transparent py-2.5 pl-3 pr-2 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                }
                onClick={() => onSelect(field.key)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    />
                  ) : (
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" />
                  )}
                  <span className="truncate">{field.label}</span>
                  {field.derived ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      derived
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {count}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </li>
  )
}
