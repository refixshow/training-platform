import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface BodyweightChartEntry {
  createdAt: number
  valueKg: number
}

interface BodyweightChartProps {
  entries: readonly BodyweightChartEntry[]
  latestValueKg: number | null
  rangeLabel: string
}

export function BodyweightChart({
  entries,
  latestValueKg,
  rangeLabel,
}: BodyweightChartProps) {
  if (entries.length === 0) {
    return null
  }

  const chartData = entries.map((entry) => ({
    date: formatShortDate(entry.createdAt),
    valueKg: entry.valueKg,
  }))
  const values = entries.map((entry) => entry.valueKg)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const padding = Math.max((maxValue - minValue) * 0.15, 1)

  return (
    <div
      aria-label={`Trend masy ciala od ${rangeLabel}. Ostatni wynik ${
        latestValueKg ?? 'brak'
      } kg.`}
      className="h-56 w-full"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 600 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            domain={[minValue - padding, maxValue + padding]}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 600 }}
            tickFormatter={(value: number) => `${formatNumber(value)} kg`}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<BodyweightTooltip />}
            cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
          />
          <Line
            activeDot={{ r: 5, fill: 'var(--color-primary)' }}
            dataKey="valueKg"
            dot={{ r: 3, fill: 'var(--color-primary)', stroke: 'var(--color-primary)' }}
            stroke="var(--color-primary)"
            strokeWidth={3}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function BodyweightTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: string } }>
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
      <p className="mt-1 tabular-nums text-foreground">{formatNumber(value)} kg</p>
    </div>
  )
}

function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
  }).format(timestamp)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 1,
  }).format(value)
}
