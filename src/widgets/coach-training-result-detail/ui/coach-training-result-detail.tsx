import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import type { FunctionReturnType } from 'convex/server'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Lock,
} from 'lucide-react'

import {
  formatDurationMinutesForReview,
  formatPlanSummary,
  formatReviewDetailDate,
  formatSetSubmittedValues,
  formatSetTargetValues,
  formatSetsCount,
  formatVolumeForReview,
  getTrainingResultFields,
  type TrainingResultField,
} from '#/entities/training-result'
import {
  getCompletedSetCount,
  getPlannedSetCount,
  isPartialSubmission,
  reconcilePlanWithSubmission,
  type ReconciledExerciseBlock,
  type ReconciledSet,
} from '#/features/review-training-result'
import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

type ResultWithPlan = FunctionReturnType<
  typeof api.trainingResults.getCoachReviewResultWithPlan
>

interface CoachTrainingResultDetailProps {
  clientId: string
  trainingResultId: string
}

export function CoachTrainingResultDetail({
  clientId,
  trainingResultId,
}: CoachTrainingResultDetailProps) {
  if (!hasConfiguredConvexUrl()) {
    return <SetupState />
  }

  return (
    <ConnectedCoachTrainingResultDetail
      clientId={clientId as Id<'users'>}
      trainingResultId={trainingResultId as Id<'trainingResults'>}
    />
  )
}

function ConnectedCoachTrainingResultDetail({
  clientId,
  trainingResultId,
}: {
  clientId: Id<'users'>
  trainingResultId: Id<'trainingResults'>
}) {
  const detailQuery = useQuery(
    convexQuery(api.trainingResults.getCoachReviewResultWithPlan, {
      traineeId: clientId,
      trainingResultId,
    }),
  )

  if (detailQuery.error) {
    return <DetailErrorFrame clientId={clientId} error={detailQuery.error} />
  }

  if (detailQuery.isPending || !detailQuery.data) {
    return <DetailSkeleton />
  }

  return <DetailContent clientId={clientId} detail={detailQuery.data} />
}

function DetailContent({
  clientId,
  detail,
}: {
  clientId: Id<'users'>
  detail: ResultWithPlan
}) {
  const blocks = reconcilePlanWithSubmission(detail.plan?.blocks, detail.setResults)
  const completed = getCompletedSetCount(blocks)
  const planned = getPlannedSetCount(blocks)
  const partial = isPartialSubmission(blocks)
  const traineeName = detail.trainee?.name ?? detail.trainee?.email ?? 'Klient'
  const programTitle = detail.program?.title ?? null
  const routineName = detail.routine?.name ?? detail.plan?.routine.name ?? 'Trening'
  const duration = formatDurationMinutesForReview(detail.durationMinutes)
  const setsLabel = formatSetsCount(
    completed,
    planned > 0 ? planned : undefined,
  )
  const volume = formatVolumeForReview(detail.volumeKg)

  return (
    <section className="mx-auto grid w-full max-w-[60rem] gap-7 pb-12">
      <DetailHeader clientId={clientId} traineeName={traineeName} />

      <article className="grid gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Trening klienta
        </p>
        <h1 className="text-3xl font-bold tracking-tight tabular-nums text-foreground sm:text-4xl">
          {formatReviewDetailDate(detail.completedAt)}
        </h1>
        <p className="text-base text-muted-foreground">
          <span className="font-semibold text-foreground">{routineName}</span>
          {programTitle ? (
            <>
              <span aria-hidden="true" className="mx-2 text-border">
                ·
              </span>
              <span>{programTitle}</span>
            </>
          ) : null}
        </p>

        <DetailFacts
          duration={duration}
          partial={partial}
          setsLabel={setsLabel}
          volume={volume}
        />
      </article>

      {detail.notes ? <NotesBlock notes={detail.notes} /> : null}

      {blocks.length > 0 ? (
        <div className="grid gap-8 border-t border-border pt-2">
          {blocks.map((block) => (
            <ExerciseSection block={block} key={block.id} />
          ))}
        </div>
      ) : (
        <EmptyExerciseState />
      )}

      <footer className="border-t border-border pt-5">
        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md px-1 text-sm font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          params={{ clientId }}
          search={{ clientId: undefined }}
          to="/clients/$clientId"
        >
          Otworz profil klienta
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </footer>
    </section>
  )
}

function DetailHeader({
  clientId,
  traineeName,
}: {
  clientId: Id<'users'>
  traineeName: string
}) {
  return (
    <nav aria-label="Sciezka powrotu" className="flex items-center gap-2 text-sm">
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-md px-1 font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        params={{ clientId }}
        search={{ programId: undefined, range: '4w' }}
        to="/clients/$clientId/results"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Wyniki
      </Link>
      <span aria-hidden="true" className="text-border">
        ·
      </span>
      <span className="truncate text-muted-foreground">{traineeName}</span>
    </nav>
  )
}

function DetailFacts({
  duration,
  partial,
  setsLabel,
  volume,
}: {
  duration: string | null
  partial: boolean
  setsLabel: string | null
  volume: string | null
}) {
  const facts: { label: string; value: string }[] = []
  if (duration) facts.push({ label: 'Czas', value: duration })
  if (setsLabel) facts.push({ label: 'Serie', value: setsLabel })
  if (volume) facts.push({ label: 'Wolumen', value: volume })

  if (facts.length === 0 && !partial) {
    return null
  }

  return (
    <dl className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-border pt-5">
      {facts.map((fact, index) => (
        <div className="grid gap-1" key={`${fact.label}-${index}`}>
          <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {fact.label}
          </dt>
          <dd className="text-lg font-semibold tabular-nums text-foreground">
            {fact.value}
          </dd>
        </div>
      ))}
      {partial ? (
        <span className="inline-flex min-h-9 items-center rounded-md border border-border bg-muted px-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Niedokonczona
        </span>
      ) : null}
    </dl>
  )
}

function NotesBlock({ notes }: { notes: string }) {
  return (
    <section className="grid gap-2 border-t border-border pt-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Notatka klienta
      </p>
      <p className="max-w-[68ch] whitespace-pre-line text-base leading-relaxed text-foreground">
        {notes}
      </p>
    </section>
  )
}

function ExerciseSection({ block }: { block: ReconciledExerciseBlock }) {
  const fields = block.exerciseType
    ? getTrainingResultFields(block.exerciseType)
    : (['weightKg', 'reps', 'rpe'] as const)
  const planSummary = block.exerciseType
    ? formatPlanSummary(
        block.exerciseType,
        block.sets
          .map((set) => set.target)
          .filter((target): target is NonNullable<typeof target> => target !== null),
        block.restSeconds,
      )
    : null

  return (
    <article aria-label={block.exerciseName} className="grid gap-3">
      <header className="grid gap-1">
        <h2 className="text-xl font-semibold text-foreground">
          {block.exerciseName}
        </h2>
        {planSummary ? (
          <p className="text-sm text-muted-foreground">{planSummary}</p>
        ) : block.plannedSetCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            Serie poza planem rutyny.
          </p>
        ) : null}
        {block.videoUrl ? (
          <a
            className="inline-flex min-h-9 w-fit items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href={block.videoUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Obejrzyj video
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </header>
      <ol className="grid border-t border-border">
        {block.sets.map((set) => (
          <li className="border-b border-border" key={`${block.id}-${set.setIndex}`}>
            <SetRow fields={fields} set={set} />
          </li>
        ))}
      </ol>
    </article>
  )
}

function SetRow({
  fields,
  set,
}: {
  fields: readonly TrainingResultField[]
  set: ReconciledSet
}) {
  const submittedValues = set.submission
    ? formatSetSubmittedValues(set.submission, fields)
    : null
  const targetValues = formatSetTargetValues(set.target ?? undefined, fields)
  const completed = set.submission !== null
  const exceededTarget = isAboveTarget(set, fields)

  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-3 py-3 sm:grid-cols-[6rem_1fr_minmax(0,18rem)] sm:py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Seria {set.setIndex}
      </p>
      <p
        className={`tabular-nums ${
          completed
            ? exceededTarget
              ? 'text-base font-semibold text-foreground'
              : 'text-base text-foreground'
            : 'text-sm italic text-muted-foreground'
        }`}
      >
        {completed ? submittedValues || '—' : 'nie wykonano'}
      </p>
      {targetValues ? (
        <p className="col-span-2 text-xs text-muted-foreground sm:col-span-1 sm:text-right">
          cel: <span className="tabular-nums">{targetValues}</span>
        </p>
      ) : (
        <span className="col-span-2 sm:col-span-1" />
      )}
    </div>
  )
}

function isAboveTarget(
  set: ReconciledSet,
  fields: readonly TrainingResultField[],
): boolean {
  if (!set.submission || !set.target) {
    return false
  }

  for (const field of fields) {
    switch (field) {
      case 'weightKg': {
        if (
          set.submission.weightKg !== undefined &&
          set.target.weightKg !== undefined &&
          set.submission.weightKg > set.target.weightKg
        ) {
          return true
        }
        break
      }
      case 'reps': {
        if (set.submission.reps === undefined) break
        const ceiling = set.target.repsMax ?? set.target.reps
        if (ceiling !== undefined && set.submission.reps > ceiling) {
          return true
        }
        break
      }
      case 'durationSeconds': {
        if (
          set.submission.durationSeconds !== undefined &&
          set.target.durationSeconds !== undefined &&
          set.submission.durationSeconds > set.target.durationSeconds
        ) {
          return true
        }
        break
      }
      case 'distanceMeters': {
        if (
          set.submission.distanceMeters !== undefined &&
          set.target.distanceMeters !== undefined &&
          set.submission.distanceMeters > set.target.distanceMeters
        ) {
          return true
        }
        break
      }
    }
  }

  return false
}

function EmptyExerciseState() {
  return (
    <div className="rounded-md border border-dashed border-border px-5 py-8 text-center">
      <p className="text-base font-semibold text-foreground">
        Ten trening nie ma zapisanych serii.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        To moze sie zdarzyc, jesli klient wyslal pusty trening. Zajrzyj do
        innych wynikow w historii.
      </p>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <section className="mx-auto grid w-full max-w-[60rem] gap-7 pb-12">
      <div className="h-5 w-40 rounded-md bg-muted" />
      <div className="grid gap-3">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-10 w-3/4 rounded-md bg-muted" />
        <div className="h-4 w-1/2 rounded-md bg-muted" />
        <div className="mt-3 flex gap-6 border-t border-border pt-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="grid gap-2" key={`fact-skel-${index}`}>
              <div className="h-3 w-12 rounded-md bg-muted" />
              <div className="h-5 w-20 rounded-md bg-muted" />
            </div>
          ))}
        </div>
      </div>
      {Array.from({ length: 2 }, (_, index) => (
        <div className="grid gap-3 border-t border-border pt-5" key={`block-skel-${index}`}>
          <div className="h-5 w-2/3 rounded-md bg-muted" />
          <div className="h-3 w-1/2 rounded-md bg-muted" />
          <div className="grid gap-2 pt-2">
            {Array.from({ length: 3 }, (_, setIndex) => (
              <div
                className="grid grid-cols-[6rem_1fr] gap-3 py-2"
                key={`block-${index}-set-${setIndex}`}
              >
                <div className="h-3 w-16 rounded-md bg-muted" />
                <div className="h-4 rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function DetailErrorFrame({
  clientId,
  error,
}: {
  clientId: Id<'users'>
  error: Error
}) {
  const normalized = error.message.toLocaleLowerCase('pl-PL')
  const isAccess =
    normalized.includes('dostep') ||
    normalized.includes('access') ||
    normalized.includes('not allowed')
  const isMissing =
    normalized.includes('nie istnieje') || normalized.includes('not found')

  const Icon = isAccess ? Lock : AlertCircle
  const title = isAccess
    ? 'Nie masz dostepu do wynikow tego klienta.'
    : isMissing
      ? 'Ten trening nie istnieje lub nalezy do innego klienta.'
      : 'Nie mozemy pobrac szczegolow treningu.'

  return (
    <section className="grid gap-5">
      <Link
        className="inline-flex w-fit min-h-10 items-center gap-2 rounded-md px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        params={{ clientId }}
        search={{ programId: undefined, range: '4w' }}
        to="/clients/$clientId/results"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Wyniki
      </Link>
      <div className="grid gap-3 rounded-md border border-border bg-muted/50 px-5 py-6">
        <Icon aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
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
        , zeby wlaczyc szczegoly wyniku.
      </p>
    </section>
  )
}
