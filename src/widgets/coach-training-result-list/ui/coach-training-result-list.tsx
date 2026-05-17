import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import type { FunctionReturnType } from 'convex/server'
import { AlertCircle, ArrowLeft, ArrowRight, Lock } from 'lucide-react'

import {
  REVIEW_RANGE_OPTIONS,
  formatDurationMinutesForReview,
  formatReviewListDate,
  formatSetsCount,
  formatVolumeForReview,
  getReviewRangeStart,
  type ReviewRange,
} from '#/entities/training-result'
import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

type ReviewListResults = FunctionReturnType<
  typeof api.trainingResults.listForCoachReview
>
type ReviewListRow = ReviewListResults[number]
type ReviewProgramsResult = FunctionReturnType<
  typeof api.trainingResults.listProgramsForCoachReview
>

interface CoachTrainingResultListProps {
  clientId: string
  range: ReviewRange
  programId?: string
}

export function CoachTrainingResultList({
  clientId,
  range,
  programId,
}: CoachTrainingResultListProps) {
  if (!hasConfiguredConvexUrl()) {
    return <SetupState />
  }

  return (
    <ConnectedCoachTrainingResultList
      clientId={clientId as Id<'users'>}
      programId={programId as Id<'programs'> | undefined}
      range={range}
    />
  )
}

function ConnectedCoachTrainingResultList({
  clientId,
  programId,
  range,
}: {
  clientId: Id<'users'>
  programId?: Id<'programs'>
  range: ReviewRange
}) {
  const overviewQuery = useQuery(
    convexQuery(api.coachClients.getClientOverview, { traineeId: clientId }),
  )
  const programsQuery = useQuery(
    convexQuery(api.trainingResults.listProgramsForCoachReview, {
      traineeId: clientId,
    }),
  )
  const rangeStart = useMemo(() => getReviewRangeStart(range), [range])
  const filtersActive = range !== 'all' || Boolean(programId)
  const resultsQuery = useQuery(
    convexQuery(api.trainingResults.listForCoachReview, {
      programId,
      rangeStart,
      traineeId: clientId,
    }),
  )
  const fallbackEnabled =
    filtersActive && !resultsQuery.isPending && (resultsQuery.data?.length ?? 0) === 0
  const fallbackQuery = useQuery({
    ...convexQuery(api.trainingResults.listForCoachReview, {
      traineeId: clientId,
    }),
    enabled: fallbackEnabled,
  })

  if (overviewQuery.error || resultsQuery.error) {
    return <ListErrorFrame error={overviewQuery.error ?? resultsQuery.error} />
  }

  if (overviewQuery.isPending || !overviewQuery.data) {
    return <ListSkeleton />
  }

  const overview = overviewQuery.data
  const programs = programsQuery.data ?? []
  const primaryResults = resultsQuery.data ?? []
  const fallbackResults = fallbackQuery.data ?? []
  const traineeName = overview.trainee.name ?? overview.trainee.email ?? 'Klient'
  const hasActiveProgram = Boolean(overview.currentAssignment)
  const showFallback =
    fallbackEnabled && fallbackResults.length > 0 && !fallbackQuery.isPending
  const renderedResults = showFallback ? fallbackResults : primaryResults

  return (
    <section className="mx-auto grid w-full max-w-[55rem] gap-7">
      <ListHeader
        clientId={clientId}
        traineeEmail={overview.trainee.email}
        traineeName={traineeName}
      />

      <ListFilters
        clientId={clientId}
        programId={programId}
        programs={programs}
        range={range}
      />

      {!hasActiveProgram ? <NoProgramBanner /> : null}

      {resultsQuery.isPending ? (
        <ListRowsSkeleton />
      ) : renderedResults.length === 0 ? (
        <ListEmptyState
          clientId={clientId}
          filtersActive={filtersActive}
          traineeName={traineeName}
        />
      ) : (
        <>
          {showFallback ? (
            <WidenedRangeBanner clientId={clientId} count={fallbackResults.length} />
          ) : null}
          <ListRows clientId={clientId} results={renderedResults} />
        </>
      )}
    </section>
  )
}

function WidenedRangeBanner({
  clientId,
  count,
}: {
  clientId: Id<'users'>
  count: number
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md bg-muted/60 px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        Brak treningow w wybranym zakresie. Pokazuje{' '}
        <span className="tabular-nums font-semibold text-foreground">{count}</span>{' '}
        z calej historii.
      </p>
      <Link
        className="font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        params={{ clientId }}
        search={{ programId: undefined, range: 'all' }}
        to="/clients/$clientId/results"
      >
        Przelacz na Wszystko
      </Link>
    </div>
  )
}

function ListHeader({
  clientId,
  traineeEmail,
  traineeName,
}: {
  clientId: Id<'users'>
  traineeEmail: string | null | undefined
  traineeName: string
}) {
  return (
    <header className="grid gap-3 border-b border-border pb-5">
      <Link
        className="inline-flex w-fit min-h-10 items-center gap-2 rounded-md px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        params={{ clientId }}
        search={{ clientId: undefined }}
        to="/clients/$clientId"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {traineeName}
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Treningi klienta
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
          Wyniki
        </h1>
        {traineeEmail ? (
          <p className="mt-2 text-sm text-muted-foreground">{traineeEmail}</p>
        ) : null}
      </div>
    </header>
  )
}

function ListFilters({
  clientId,
  programId,
  programs,
  range,
}: {
  clientId: Id<'users'>
  programId?: Id<'programs'>
  programs: ReviewProgramsResult
  range: ReviewRange
}) {
  return (
    <div className="grid gap-4">
      <div
        aria-label="Zakres czasu"
        className="inline-flex w-full max-w-full overflow-x-auto rounded-md border border-border bg-card p-1 text-sm font-semibold"
        role="tablist"
      >
        {REVIEW_RANGE_OPTIONS.map((option) => {
          const isActive = option.value === range
          return (
            <Link
              aria-selected={isActive}
              className={`relative flex flex-1 min-w-fit items-center justify-center rounded-sm px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              key={option.value}
              params={{ clientId }}
              role="tab"
              search={{ programId, range: option.value }}
              to="/clients/$clientId/results"
            >
              <span className="sm:hidden">{option.shortLabel}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </Link>
          )
        })}
      </div>

      {programs.length >= 2 ? (
        <div aria-label="Program" className="flex flex-wrap gap-2">
          <ProgramChip
            clientId={clientId}
            isActive={!programId}
            label="Wszystkie programy"
            range={range}
            targetProgramId={undefined}
          />
          {programs.map((program) => (
            <ProgramChip
              clientId={clientId}
              isActive={programId === program._id}
              key={program._id}
              label={program.title}
              range={range}
              targetProgramId={program._id}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProgramChip({
  clientId,
  isActive,
  label,
  range,
  targetProgramId,
}: {
  clientId: Id<'users'>
  isActive: boolean
  label: string
  range: ReviewRange
  targetProgramId?: Id<'programs'>
}) {
  return (
    <Link
      aria-pressed={isActive}
      className={`inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        isActive
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-muted-foreground hover:text-foreground'
      }`}
      params={{ clientId }}
      search={{ programId: targetProgramId, range }}
      to="/clients/$clientId/results"
    >
      {label}
    </Link>
  )
}

function NoProgramBanner() {
  return (
    <p
      className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground"
      role="status"
    >
      Klient nie ma aktywnego programu. Wyniki ponizej moga pochodzic ze
      starszych przypisan.
    </p>
  )
}

function ListRows({
  clientId,
  results,
}: {
  clientId: Id<'users'>
  results: ReviewListResults
}) {
  return (
    <ol className="@container grid border-t border-border">
      {results.map((result) => (
        <li className="border-b border-border" key={result._id}>
          <ResultRow clientId={clientId} result={result} />
        </li>
      ))}
    </ol>
  )
}

function ResultRow({
  clientId,
  result,
}: {
  clientId: Id<'users'>
  result: ReviewListRow
}) {
  const routineName = result.routine?.name ?? 'Trening'
  const programTitle = result.program?.title ?? 'Bez programu'
  const duration = formatDurationMinutesForReview(result.durationMinutes)
  const setsLabel = formatSetsCount(result.completedSets ?? undefined)
  const volume = formatVolumeForReview(result.volumeKg)
  const metrics = [duration, setsLabel, volume].filter(
    (value): value is string => Boolean(value),
  )

  return (
    <Link
      className="grid min-h-[64px] gap-1 px-1 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none sm:min-h-[56px] sm:py-5 @[40rem]:grid-cols-[1fr_auto] @[40rem]:items-baseline @[40rem]:gap-x-8"
      params={{
        clientId,
        trainingResultId: result._id,
      }}
      to="/clients/$clientId/results/$trainingResultId"
    >
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="tabular-nums">
            {formatReviewListDate(result.completedAt)}
          </span>
          <span aria-hidden="true" className="mx-2 text-border">
            ·
          </span>
          <span className="normal-case tracking-normal text-muted-foreground">
            {programTitle}
          </span>
        </p>
        <p className="text-lg font-semibold text-foreground">{routineName}</p>
      </div>
      {metrics.length > 0 ? (
        <p className="text-sm text-muted-foreground @[40rem]:text-right">
          {metrics.map((metric, index) => (
            <span key={`${result._id}-metric-${index}`}>
              {index > 0 ? (
                <span aria-hidden="true" className="mx-2 text-border">
                  ·
                </span>
              ) : null}
              <span className="tabular-nums">{metric}</span>
            </span>
          ))}
        </p>
      ) : null}
    </Link>
  )
}

function ListEmptyState({
  clientId,
  filtersActive,
  traineeName,
}: {
  clientId: Id<'users'>
  filtersActive: boolean
  traineeName: string
}) {
  if (filtersActive) {
    return (
      <div className="rounded-md border border-dashed border-border px-5 py-8 text-center">
        <p className="text-base font-semibold text-foreground">
          Brak treningow w wybranym zakresie.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Zmien filtr albo zobacz pelna historie treningow klienta.
        </p>
        <Link
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          params={{ clientId }}
          search={{ programId: undefined, range: 'all' }}
          to="/clients/$clientId/results"
        >
          Pokaz wszystkie wyniki
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-dashed border-border px-5 py-8 text-center">
      <p className="text-base font-semibold text-foreground">
        {traineeName} nie wyslal jeszcze zadnego treningu.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Wyniki pojawia sie tutaj, gdy klient zakonczy pierwsza rutyne z aktywnego
        programu.
      </p>
      <Link
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        to="/assignments"
      >
        Otworz przypisania
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  )
}

function ListSkeleton() {
  return (
    <section className="grid gap-7">
      <div className="grid gap-3 border-b border-border pb-5">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-9 w-40 rounded-md bg-muted" />
      </div>
      <div className="h-11 rounded-md bg-muted" />
      <ListRowsSkeleton />
    </section>
  )
}

function ListRowsSkeleton() {
  return (
    <ol className="grid border-t border-border">
      {Array.from({ length: 4 }, (_, index) => (
        <li
          className="grid gap-2 border-b border-border px-1 py-5"
          key={`skeleton-row-${index}`}
        >
          <div className="h-3 w-40 rounded-md bg-muted" />
          <div className="h-5 w-56 rounded-md bg-muted" />
          <div className="h-3 w-72 rounded-md bg-muted" />
        </li>
      ))}
    </ol>
  )
}

function ListErrorFrame({ error }: { error: Error | null }) {
  if (!error) {
    return null
  }

  const normalized = error.message.toLocaleLowerCase('pl-PL')
  const isAccess =
    normalized.includes('dostep') ||
    normalized.includes('access') ||
    normalized.includes('not allowed')
  const Icon = isAccess ? Lock : AlertCircle
  const title = isAccess
    ? 'Nie masz dostepu do wynikow tego klienta.'
    : 'Nie mozemy pobrac listy wynikow.'

  return (
    <section className="grid gap-3 rounded-md border border-border bg-muted/50 px-5 py-6">
      <Icon aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </section>
  )
}

function SetupState() {
  return (
    <section className="grid gap-3 rounded-md border border-border bg-muted/50 px-5 py-6">
      <h1 className="text-lg font-semibold text-foreground">
        Convex nie jest podlaczony
      </h1>
      <p className="text-sm text-muted-foreground">
        Ustaw <code className="rounded bg-background px-1.5 py-0.5">VITE_CONVEX_URL</code>
        , zeby wlaczyc podglad wynikow klienta.
      </p>
    </section>
  )
}
