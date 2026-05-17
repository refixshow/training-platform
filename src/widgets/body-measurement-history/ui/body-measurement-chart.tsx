import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  formatMetricValue,
  getMetricDef,
  type MetricKey,
} from '#/entities/body-measurement'

export interface ChartPoint {
  capturedAt: number
  value: number
}

interface BodyMeasurementChartProps {
  metric: MetricKey
  points: readonly ChartPoint[]
}

export function BodyMeasurementChart({ metric, points }: BodyMeasurementChartProps) {
  const definition = getMetricDef(metric)

  if (points.length === 0) {
    return null
  }

  const data = points.map((point) => ({
    date: formatShortDate(point.capturedAt),
    value: point.value,
  }))

  const minValue = Math.min(...points.map((point) => point.value))
  const maxValue = Math.max(...points.map((point) => point.value))
  const padding = Math.max((maxValue - minValue) * 0.15, definition.step)

  return (
    <div
      aria-label={`Wykres ${definition.label}`}
      className="h-64 w-full sm:h-72"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="date"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 600 }}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            axisLine={false}
            domain={[minValue - padding, maxValue + padding]}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 600 }}
            tickCount={3}
            tickFormatter={(value: number) => formatYAxisValue(value, definition.unit)}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip metric={metric} />}
            cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
          />
          <Line
            activeDot={{ r: 5, fill: 'var(--color-primary)' }}
            dataKey="value"
            dot={{ r: 3, fill: 'var(--color-primary)', stroke: 'var(--color-primary)' }}
            stroke="var(--color-primary)"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: string } }>
  metric: MetricKey
}) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const value = payload[0]?.value
  const label = payload[0]?.payload.date

  if (value === undefined) {
    return null
  }

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold shadow-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-foreground tabular-nums">
        {formatMetricValue(metric, value)}
      </p>
    </div>
  )
}

function formatYAxisValue(value: number, unit: string): string {
  const formatter = new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 1,
  })

  return `${formatter.format(value)} ${unit}`
}

function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
  }).format(timestamp)
}
