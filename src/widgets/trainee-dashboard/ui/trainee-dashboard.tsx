import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import type { FunctionReturnType } from 'convex/server'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Dumbbell,
  ImagePlus,
  Link as LinkIcon,
  Lock,
  Play,
  Scale,
  TrendingUp,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../../../convex/_generated/api'

import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'
import { Card, CardBody, CardHeader } from '#/shared/ui/card'

type DashboardOverview = FunctionReturnType<typeof api.traineeDashboard.getOverview>
type CurrentProgram = NonNullable<DashboardOverview['currentProgram']>
type RecentTraining = DashboardOverview['recentTrainingResults'][number]
type ActivityDay = DashboardOverview['activity']['days'][number]
type ProgressPhoto = DashboardOverview['progressPhotos'][number]

export function TraineeDashboard() {
  if (!hasConfiguredConvexUrl()) {
    return <DashboardSetupState />
  }

  return <ConnectedTraineeDashboard />
}

function ConnectedTraineeDashboard() {
  const dashboardQuery = useQuery(
    convexQuery(api.traineeDashboard.getOverview, {}),
  )

  if (dashboardQuery.isPending) {
    return <DashboardSkeleton />
  }

  if (dashboardQuery.error) {
    return <DashboardError error={dashboardQuery.error} />
  }

  if (!dashboardQuery.data) {
    return <DashboardSkeleton />
  }

  return <DashboardContent overview={dashboardQuery.data} />
}

function DashboardContent({ overview }: { overview: DashboardOverview }) {
  return (
    <section className="grid gap-6 pb-4">
      <DashboardHeader currentProgram={overview.currentProgram} />

      <CurrentProgramPanel currentProgram={overview.currentProgram} />

      <section
        aria-label="Podsumowanie tygodnia"
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
      >
        <WeeklySummary overview={overview} />
        <ActivitySummary activity={overview.activity} />
      </section>

      <section
        aria-label="Postep"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]"
      >
        <BodyweightTrend bodyweight={overview.bodyweight} />
        <ProgressPhotoPreview photos={overview.progressPhotos} />
      </section>

      <RecentTrainingResults results={overview.recentTrainingResults} />
    </section>
  )
}

function DashboardHeader({
  currentProgram,
}: {
  currentProgram: CurrentProgram | null
}) {
  return (
    <header className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">Panel podopiecznego</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-normal text-foreground sm:text-4xl">
          Twoj trening dzisiaj
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Sprawdz aktualny program, rytm tygodnia i ostatnie wyniki bez
          przeladowania statystykami.
        </p>
      </div>

      {currentProgram?.nextRoutine ? (
        <Link
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-semibold text-primary-foreground transition-[background-color,border-color,color,transform] duration-150 ease-out hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
          search={{
            assignmentId: currentProgram._id,
            routineId: currentProgram.nextRoutine._id,
          }}
          to="/my-program/training"
        >
          <Play aria-hidden="true" className="h-4 w-4" />
          Rozpocznij trening
        </Link>
      ) : (
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          to="/my-program"
        >
          Moj program
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </header>
  )
}

function CurrentProgramPanel({
  currentProgram,
}: {
  currentProgram: CurrentProgram | null
}) {
  if (!currentProgram) {
    return (
      <Card>
        <CardBody padding="lg">
          <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Dumbbell aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Nie masz jeszcze przypisanego programu
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Gdy coach przypisze Ci program, tutaj pojawi sie nastepny krok,
                rutyny i szybkie wejscie do treningu.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Aktualny program
            </div>
            <h2 className="mt-2 text-2xl font-bold text-foreground">
              {currentProgram.program.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {currentProgram.program.description ||
                'Coach nie dodal jeszcze opisu programu.'}
            </p>
          </div>

          <div className="grid gap-3">
            <ProgramFact
              label="Rutyny"
              value={`${currentProgram.program.routineCount}`}
            />
            <ProgramFact
              label="Czas trwania"
              value={`${currentProgram.program.durationWeeks} tyg.`}
            />
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              to="/my-program"
            >
              Kontynuuj program
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function ProgramFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function WeeklySummary({ overview }: { overview: DashboardOverview }) {
  const hasVolume = overview.week.volumeKg > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground">Ten tydzien</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              Trening w liczbach
            </h2>
          </div>
          <span className="inline-flex rounded-md bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
            {overview.week.rangeLabel}
          </span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile
            icon={Clock3}
            label="Czas"
            meta={overview.week.rangeLabel}
            value={formatMinutes(overview.week.durationMinutes)}
          />
          <MetricTile
            icon={CheckCircle2}
            label="Serie"
            meta={overview.week.rangeLabel}
            value={`${overview.week.completedSets} serii`}
          />
          <MetricTile
            icon={TrendingUp}
            label="Wolumen"
            meta={hasVolume ? overview.week.rangeLabel : 'Tylko serie z kg i powt.'}
            value={hasVolume ? `${formatNumber(overview.week.volumeKg)} kg` : 'Brak danych'}
          />
        </div>

        {overview.week.resultCount === 0 ? (
          <InlineNotice
            icon={CalendarDays}
            title="Statystyki pojawia sie po treningu"
          >
            Zapisz pierwszy trening w tym tygodniu, zeby zobaczyc czas, serie i
            wolumen z realnych wynikow.
          </InlineNotice>
        ) : null}
      </CardBody>
    </Card>
  )
}

function MetricTile({
  icon: Icon,
  label,
  meta,
  value,
}: {
  icon: typeof Clock3
  label: string
  meta: string
  value: string
}) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{meta}</p>
    </div>
  )
}

function ActivitySummary({
  activity,
}: {
  activity: DashboardOverview['activity']
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-bold text-muted-foreground">
          Aktywnosc, {activity.rangeLabel}
        </p>
        <h2 className="mt-1 text-xl font-bold text-foreground">
          {activity.totalCompletions} ukonczonych dni
        </h2>
      </CardHeader>
      <CardBody>
        <ActivityStrip days={activity.days} />
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Kazde pole reprezentuje dzien. Mocniejszy kolor oznacza zapisany
          trening, etykieta dnia pozostaje dostepna dla czytnikow.
        </p>
      </CardBody>
    </Card>
  )
}

function ActivityStrip({ days }: { days: ActivityDay[] }) {
  return (
    <ol
      aria-label="Ostatnie dni aktywnosci"
      className="grid grid-cols-7 gap-2"
    >
      {days.map((day) => {
        const completed = day.trainingCount > 0

        return (
          <li key={day.date}>
            <span
              aria-label={`${formatDate(day.date)}: ${
                completed
                  ? `${day.trainingCount} trening, ${formatMinutes(day.durationMinutes)}`
                  : 'brak treningu'
              }`}
              className={
                completed
                  ? 'flex aspect-square min-h-9 items-center justify-center rounded-md bg-primary text-xs font-bold tabular-nums text-primary-foreground'
                  : 'flex aspect-square min-h-9 items-center justify-center rounded-md border border-border bg-background text-xs font-bold tabular-nums text-muted-foreground'
              }
              title={formatDate(day.date)}
            >
              {new Date(day.date).getDate()}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function BodyweightTrend({
  bodyweight,
}: {
  bodyweight: DashboardOverview['bodyweight']
}) {
  if (bodyweight.entries.length === 0) {
    return (
      <Card>
        <CardBody padding="lg">
          <EmptySection
            icon={Scale}
            title="Brak historii masy ciala"
            actionLabel="Dodawanie masy ciala bedzie dostepne po potwierdzeniu zrodla danych."
          >
            Ten dashboard pokaze trend w kg, gdy w tabeli bodyweightEntries
            pojawia sie wpisy dla Twojego konta.
          </EmptySection>
        </CardBody>
      </Card>
    )
  }

  const chartData = bodyweight.entries.map((entry) => ({
    date: formatShortDate(entry.createdAt),
    valueKg: entry.valueKg,
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground">
              Masa ciala, {bodyweight.rangeLabel}
            </p>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              {bodyweight.latest?.valueKg} kg ostatnio
            </h2>
          </div>
          <Scale aria-hidden="true" className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardBody>
        <div
          aria-label={`Trend masy ciala od ${bodyweight.rangeLabel}. Ostatni wynik ${bodyweight.latest?.valueKg} kg.`}
          className="h-56 w-full"
          role="img"
        >
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
              <CartesianGrid stroke="oklch(88% 0.014 96)" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                tick={{ fill: 'oklch(48% 0.02 245)', fontSize: 12, fontWeight: 600 }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fill: 'oklch(48% 0.02 245)', fontSize: 12, fontWeight: 600 }}
                tickLine={false}
                unit=" kg"
                width={48}
              />
              <Tooltip
                formatter={(value) => [`${value} kg`, 'Masa']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line
                activeDot={{ r: 5 }}
                dataKey="valueKg"
                dot={{ r: 3 }}
                stroke="oklch(52% 0.17 151)"
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}

function ProgressPhotoPreview({ photos }: { photos: ProgressPhoto[] }) {
  if (photos.length === 0) {
    return (
      <Card>
        <CardBody padding="lg">
          <EmptySection
            icon={Camera}
            title="Brak zdjec progresu"
            actionLabel="Dodaj zdjecie progresu po wlaczeniu uploadu."
          >
            Gdy dodasz zdjecia, zobaczysz tutaj ostatnie ujecia z data i
            opcjonalna masa ciala.
          </EmptySection>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground">
              Zdjecia progresu
            </p>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              Ostatnie ujecia
            </h2>
          </div>
          <ImagePlus aria-hidden="true" className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <figure className="min-w-0" key={photo._id}>
              <img
                alt={`Zdjecie progresu z ${formatDate(photo.capturedAt)}`}
                className="aspect-[3/4] w-full rounded-md border border-border object-cover"
                loading="lazy"
                src={photo.url ?? ''}
              />
              <figcaption className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">
                {formatShortDate(photo.capturedAt)}
                {photo.bodyweightKg ? `, ${photo.bodyweightKg} kg` : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function RecentTrainingResults({ results }: { results: RecentTraining[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground">
              Ostatnie treningi
            </p>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              Zapisane wyniki
            </h2>
          </div>
          <Activity aria-hidden="true" className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>

      {results.length === 0 ? (
        <CardBody padding="lg">
          <EmptySection
            icon={Dumbbell}
            title="Nie masz jeszcze zapisanych treningow"
            actionLabel="Rozpocznij trening z aktualnego programu, zeby zbudowac historie."
          >
            Lista wynikow pokaze rutyne, date, czas, serie i wiarygodny wolumen
            po pierwszym zapisie.
          </EmptySection>
        </CardBody>
      ) : (
        <div className="grid">
          {results.map((result) => (
            <RecentTrainingRow key={result._id} result={result} />
          ))}
        </div>
      )}
    </Card>
  )
}

function RecentTrainingRow({ result }: { result: RecentTraining }) {
  return (
    <article className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-foreground">
          {result.routine?.name ?? 'Trening'}
        </h3>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {formatDate(result.completedAt)}
          {result.program ? ` - ${result.program.title}` : ''}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 sm:min-w-[24rem]">
        <CompactFact label="Czas" value={formatMinutes(result.durationMinutes ?? 0)} />
        <CompactFact label="Serie" value={`${result.completedSets}`} />
        <CompactFact
          label="Wolumen"
          value={result.volumeKg ? `${formatNumber(result.volumeKg)} kg` : 'Brak'}
        />
      </dl>
    </article>
  )
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-bold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function EmptySection({
  actionLabel,
  children,
  icon: Icon,
  title,
}: {
  actionLabel: string
  children: React.ReactNode
  icon: typeof Dumbbell
  title: string
}) {
  return (
    <div className="flex max-w-2xl items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
        <p className="mt-3 text-xs font-bold leading-5 text-foreground">
          {actionLabel}
        </p>
      </div>
    </div>
  )
}

function InlineNotice({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  icon: typeof CalendarDays
  title: string
}) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-md border border-border bg-muted px-4 py-3">
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <section className="grid gap-6">
      <header className="border-b border-border pb-5">
        <div className="h-4 w-40 rounded-md bg-muted" />
        <div className="mt-3 h-10 max-w-xl rounded-md bg-muted" />
        <div className="mt-4 h-16 max-w-2xl rounded-md bg-muted" />
      </header>
      <div className="h-52 rounded-lg border border-border bg-card p-5">
        <div className="h-5 w-40 rounded-md bg-muted" />
        <div className="mt-4 h-8 max-w-md rounded-md bg-muted" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-md bg-muted" />
          <div className="h-20 rounded-md bg-muted" />
          <div className="h-20 rounded-md bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="h-72 rounded-lg border border-border bg-card p-5" />
        <div className="h-72 rounded-lg border border-border bg-card p-5" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-80 rounded-lg border border-border bg-card p-5" />
        <div className="h-80 rounded-lg border border-border bg-card p-5" />
      </div>
    </section>
  )
}

function DashboardError({ error }: { error: Error }) {
  const isAccessError = error.message.toLocaleLowerCase('pl-PL').includes('access')

  return (
    <StateFrame
      icon={isAccessError ? Lock : AlertCircle}
      title={
        isAccessError
          ? 'Nie masz dostepu do panelu podopiecznego'
          : 'Nie mozemy pobrac dashboardu'
      }
      tone={isAccessError ? 'warning' : 'error'}
    >
      Odswiez strone albo wroc pozniej. Szczegoly: {error.message}
    </StateFrame>
  )
}

function DashboardSetupState() {
  return (
    <StateFrame icon={LinkIcon} title="Convex nie jest podlaczony" tone="warning">
      Ustaw `VITE_CONVEX_URL`, zeby wlaczyc dashboard podopiecznego i
      autoryzowane odczyty postepu.
    </StateFrame>
  )
}

function StateFrame({
  children,
  icon: Icon,
  title,
  tone,
}: {
  children: React.ReactNode
  icon: typeof AlertCircle
  title: string
  tone: 'error' | 'warning'
}) {
  const iconClass =
    tone === 'error'
      ? 'bg-destructive text-destructive-foreground'
      : 'bg-accent text-accent-foreground'

  return (
    <section className="grid min-h-[calc(100vh-8rem)] place-items-center">
      <Card>
        <CardBody padding="lg">
          <div className="flex max-w-2xl items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {children}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(timestamp)
}

function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
  }).format(timestamp)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 0,
  }).format(value)
}
