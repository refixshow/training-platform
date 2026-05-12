import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import type { FunctionReturnType } from 'convex/server'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  ExternalLink,
  Link as LinkIcon,
  ListChecks,
  Lock,
  Play,
  TimerReset,
} from 'lucide-react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import { getExerciseEquipmentLabel, getExerciseTypeLabel } from '#/entities/exercise'
import { formatAssignmentDate } from '#/entities/program'
import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardHeader } from '#/shared/ui/card'

type TraineeAssignmentSummary = FunctionReturnType<
  typeof api.programAssignments.listForTrainee
>[number]
type AssignedProgramDetail = FunctionReturnType<
  typeof api.programAssignments.getAssignedProgram
>
type RoutineDetail = AssignedProgramDetail['routines'][number]
type ExerciseBlock = RoutineDetail['exercises'][number]
type SetTarget = ExerciseBlock['setTargets'][number]

export function TraineeProgramView() {
  if (!hasConfiguredConvexUrl()) {
    return <TraineeProgramSetupState />
  }

  return <ConnectedTraineeProgramView />
}

function ConnectedTraineeProgramView() {
  const [selectedAssignmentId, setSelectedAssignmentId] =
    useState<Id<'programAssignments'> | null>(null)
  const [selectedRoutineId, setSelectedRoutineId] =
    useState<Id<'routines'> | null>(null)
  const assignmentsQuery = useQuery(
    convexQuery(api.programAssignments.listForTrainee, { limit: 20 }),
  )
  const currentUserQuery = useQuery(convexQuery(api.auth.currentUser, {}))
  const assignments = assignmentsQuery.data ?? []

  useEffect(() => {
    if (assignments.length === 0) {
      setSelectedAssignmentId(null)
      return
    }

    if (
      !selectedAssignmentId ||
      !assignments.some((assignment) => assignment._id === selectedAssignmentId)
    ) {
      setSelectedAssignmentId(assignments[0]._id)
    }
  }, [assignments, selectedAssignmentId])

  const detailQuery = useQuery(
    convexQuery(
      api.programAssignments.getAssignedProgram,
      selectedAssignmentId ? { assignmentId: selectedAssignmentId } : 'skip',
    ),
  )
  const detail = detailQuery.data

  useEffect(() => {
    if (!detail || detail.routines.length === 0) {
      setSelectedRoutineId(null)
      return
    }

    if (
      !selectedRoutineId ||
      !detail.routines.some((routine) => routine._id === selectedRoutineId)
    ) {
      setSelectedRoutineId(detail.routines[0]._id)
    }
  }, [detail, selectedRoutineId])

  const selectedRoutine = useMemo(() => {
    if (!detail || !selectedRoutineId) {
      return null
    }

    return (
      detail.routines.find((routine) => routine._id === selectedRoutineId) ??
      detail.routines[0] ??
      null
    )
  }, [detail, selectedRoutineId])

  if (assignmentsQuery.isPending) {
    return <TraineeProgramSkeleton />
  }

  if (assignmentsQuery.error) {
    return <TraineeProgramError error={assignmentsQuery.error} />
  }

  if (assignments.length === 0) {
    return (
      <NoAssignedProgramState
        hasCoach={Boolean(currentUserQuery.data?.coachId)}
      />
    )
  }

  if (detailQuery.error) {
    return <TraineeProgramError error={detailQuery.error} />
  }

  if (!detail || detailQuery.isPending) {
    return <TraineeProgramSkeleton />
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <header className="grid gap-5 border-b border-border pb-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Widok podopiecznego</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-normal text-foreground sm:text-4xl">
            {detail.program.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {detail.program.description || 'Coach nie dodal jeszcze opisu programu.'}
          </p>
        </div>

        <ProgramSwitcher
          assignments={assignments}
          selectedAssignmentId={detail._id}
          onSelect={setSelectedAssignmentId}
        />
      </header>

      <section
        aria-label="Podsumowanie programu"
        className="grid gap-3 sm:grid-cols-3"
      >
        <ProgramFact
          icon={CalendarClock}
          label="Czas trwania"
          value={`${detail.program.durationWeeks} tyg.`}
        />
        <ProgramFact
          icon={ListChecks}
          label="Rutyny"
          value={`${detail.routines.length}`}
        />
        <ProgramFact
          icon={Clock}
          label="Przypisano"
          value={formatAssignmentDate(detail.assignedAt)}
        />
      </section>

      <CurrentRoutinePanel assignmentId={detail._id} routine={selectedRoutine} />

      {detail.routines.length === 0 ? (
        <AssignedProgramWithoutRoutines />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)]">
          <RoutineList
            routines={detail.routines}
            selectedRoutineId={selectedRoutine?._id ?? null}
            onSelect={setSelectedRoutineId}
          />
          <RoutinePreview routine={selectedRoutine} />
        </div>
      )}
    </section>
  )
}

function ProgramSwitcher({
  assignments,
  onSelect,
  selectedAssignmentId,
}: {
  assignments: TraineeAssignmentSummary[]
  onSelect: (assignmentId: Id<'programAssignments'>) => void
  selectedAssignmentId: Id<'programAssignments'>
}) {
  if (assignments.length <= 1) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-xs font-bold text-muted-foreground">Aktywny program</p>
        <p className="mt-1 truncate text-sm font-bold text-foreground">
          {assignments[0]?.program.title ?? 'Program'}
        </p>
      </div>
    )
  }

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-muted-foreground">
        Wybierz program
      </span>
      <select
        className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onChange={(event) => onSelect(event.target.value as Id<'programAssignments'>)}
        value={selectedAssignmentId}
      >
        {assignments.map((assignment) => (
          <option key={assignment._id} value={assignment._id}>
            {assignment.program.title}
          </option>
        ))}
      </select>
    </label>
  )
}

function ProgramFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function CurrentRoutinePanel({
  assignmentId,
  routine,
}: {
  assignmentId: Id<'programAssignments'>
  routine: RoutineDetail | null
}) {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Nastepny krok
            </div>
            <h2 className="mt-2 text-2xl font-bold text-foreground">
              {routine ? routine.name : 'Brak rutyny do rozpoczecia'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {routine
                ? 'Przejrzyj cwiczenia i cele serii przed treningiem. Logowanie bedzie podpiete w osobnym flow.'
                : 'Coach nie dodal jeszcze rutyn do tego programu.'}
            </p>
          </div>

          {routine ? (
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-base font-semibold text-primary-foreground transition-[background-color,border-color,color,transform] duration-150 ease-out hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
              search={{ assignmentId, routineId: routine._id }}
              to="/my-program/training"
            >
              <Play aria-hidden="true" className="h-4 w-4" />
              Rozpocznij trening
            </Link>
          ) : (
            <Button disabled size="lg">
              <Play aria-hidden="true" className="h-4 w-4" />
              Rozpocznij trening
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function RoutineList({
  onSelect,
  routines,
  selectedRoutineId,
}: {
  onSelect: (routineId: Id<'routines'>) => void
  routines: RoutineDetail[]
  selectedRoutineId: Id<'routines'> | null
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks aria-hidden="true" className="h-4 w-4 text-primary" />
          Rutyny w programie
        </div>
      </CardHeader>
      <div className="grid">
        {routines.map((routine, index) => {
          const isSelected = routine._id === selectedRoutineId

          return (
            <button
              aria-pressed={isSelected}
              className={
                isSelected
                  ? 'grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-accent px-4 py-4 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5'
                  : 'grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-4 text-left transition-colors hover:bg-muted/60 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5'
              }
              key={routine._id}
              onClick={() => onSelect(routine._id)}
              type="button"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-card text-sm font-bold tabular-nums text-foreground ring-1 ring-border">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">
                  {routine.name}
                </span>
                <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                  {routine.exerciseCount} cwiczen
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className={
                  isSelected
                    ? 'h-4 w-4 text-accent-foreground'
                    : 'h-4 w-4 text-muted-foreground'
                }
              />
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function RoutinePreview({ routine }: { routine: RoutineDetail | null }) {
  if (!routine) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <p className="text-xs font-bold text-muted-foreground">
            Podglad rutyny
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">{routine.name}</h2>
        </div>
      </CardHeader>
      {routine.exercises.length === 0 ? (
        <CardBody padding="lg">
          <div className="flex max-w-2xl items-start gap-3">
            <AlertCircle
              aria-hidden="true"
              className="mt-1 h-5 w-5 shrink-0 text-primary"
            />
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Ta rutyna jest jeszcze pusta
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Coach musi dodac cwiczenia, zanim ta rutyna bedzie gotowa do
                treningu.
              </p>
            </div>
          </div>
        </CardBody>
      ) : (
        <div className="grid">
          {routine.exercises.map((block, index) => (
            <ExercisePreview block={block} index={index} key={block._id} />
          ))}
        </div>
      )}
    </Card>
  )
}

function ExercisePreview({
  block,
  index,
}: {
  block: ExerciseBlock
  index: number
}) {
  return (
    <article className="grid gap-4 border-b border-border px-4 py-5 last:border-b-0 sm:px-5 lg:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-muted px-2 text-xs font-bold tabular-nums text-foreground">
            {index + 1}
          </span>
          {block.supersetGroup ? (
            <span className="inline-flex rounded-md border border-border bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
              Superset {block.supersetGroup}
            </span>
          ) : null}
          <span className="inline-flex rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
            {getExerciseTypeLabel(block.exercise.type)}
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold text-foreground">
          {block.exercise.name}
        </h3>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {getExerciseEquipmentLabel(block.exercise.equipment)}
          {block.exercise.customEquipment
            ? `: ${block.exercise.customEquipment}`
            : ''}
        </p>

        <div className="mt-4 grid gap-2">
          {block.setTargets.map((target) => (
            <div
              className="grid gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm sm:grid-cols-[4.5rem_minmax(0,1fr)]"
              key={target._id}
            >
              <span className="font-bold tabular-nums text-foreground">
                Seria {target.setIndex}
              </span>
              <span className="font-medium text-muted-foreground">
                {formatTarget(target)}
              </span>
            </div>
          ))}
        </div>

        {block.restSeconds !== undefined ? (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <TimerReset aria-hidden="true" className="h-4 w-4 text-primary" />
            Przerwa: {formatDuration(block.restSeconds)}
          </div>
        ) : null}

        {block.exercise.instructions.length > 0 ? (
          <ol className="mt-4 grid gap-2 text-sm leading-6 text-muted-foreground">
            {block.exercise.instructions.slice(0, 3).map((instruction, stepIndex) => (
              <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2" key={instruction}>
                <span className="font-bold tabular-nums text-foreground">
                  {stepIndex + 1}.
                </span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <ExerciseMedia block={block} />
    </article>
  )
}

function ExerciseMedia({ block }: { block: ExerciseBlock }) {
  if (!block.exercise.photoUrl && !block.exercise.videoUrl) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 px-4 text-center text-xs font-semibold leading-5 text-muted-foreground">
        Media nie sa wymagane dla tego cwiczenia.
      </div>
    )
  }

  return (
    <div className="grid content-start gap-3">
      {block.exercise.photoUrl ? (
        <img
          alt={`Podglad cwiczenia ${block.exercise.name}`}
          className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
          loading="lazy"
          src={block.exercise.photoUrl}
        />
      ) : null}
      {block.exercise.videoUrl ? (
        <a
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href={block.exercise.videoUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
          Otworz wideo
        </a>
      ) : null}
    </div>
  )
}

function AssignedProgramWithoutRoutines() {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="flex max-w-2xl items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Dumbbell aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Program nie ma jeszcze rutyn
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Coach przypisal program, ale nie dodal do niego treningow. Wroc tu,
              gdy program zostanie uzupelniony.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function NoAssignedProgramState({ hasCoach }: { hasCoach: boolean }) {
  return (
    <section className="grid min-h-[calc(100vh-8rem)] place-items-center">
      <Card>
        <CardBody padding="lg">
          <div className="mx-auto max-w-md text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <ClipboardList aria-hidden="true" className="h-5 w-5" />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-foreground">
              {hasCoach
                ? 'Coach nie aktywowal jeszcze programu'
                : 'Nie masz jeszcze przypisanego programu'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {hasCoach
                ? 'Konto jest juz polaczone z trenerem. Trening i submit wynikow odblokuje sie dopiero po aktywacji programu.'
                : 'Gdy coach przypisze Ci program, zobaczysz tutaj opis, czas trwania i liste rutyn do wykonania.'}
            </p>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function TraineeProgramError({ error }: { error: Error }) {
  const isAccessError = error.message.toLocaleLowerCase('pl-PL').includes('dostep')

  return (
    <section className="grid min-h-[calc(100vh-8rem)] place-items-center">
      <Card>
        <CardBody padding="lg">
          <div className="flex max-w-2xl items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              {isAccessError ? (
                <Lock aria-hidden="true" className="h-5 w-5" />
              ) : (
                <AlertCircle aria-hidden="true" className="h-5 w-5" />
              )}
            </span>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {isAccessError
                  ? 'Nie masz dostepu do tego programu'
                  : 'Nie mozemy pobrac programu'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Odswiez strone albo wroc pozniej. Szczegoly: {error.message}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function TraineeProgramSkeleton() {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <header className="border-b border-border pb-5">
        <div className="h-4 w-36 rounded-md bg-muted" />
        <div className="mt-3 h-10 max-w-xl rounded-md bg-muted" />
        <div className="mt-4 h-16 max-w-2xl rounded-md bg-muted" />
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="h-24 rounded-lg border border-border bg-card p-4" key={index}>
            <div className="h-4 w-24 rounded-md bg-muted" />
            <div className="mt-4 h-7 w-20 rounded-md bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-40 rounded-lg border border-border bg-card p-5">
        <div className="h-5 w-36 rounded-md bg-muted" />
        <div className="mt-4 h-8 max-w-md rounded-md bg-muted" />
        <div className="mt-4 h-11 w-48 rounded-md bg-muted" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)]">
        <div className="h-96 rounded-lg border border-border bg-card" />
        <div className="h-96 rounded-lg border border-border bg-card" />
      </div>
    </section>
  )
}

function TraineeProgramSetupState() {
  return (
    <section className="grid min-h-[calc(100vh-8rem)] place-items-center">
      <Card>
        <CardBody padding="lg">
          <div className="flex max-w-2xl items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <LinkIcon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Convex nie jest jeszcze podlaczony
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Ustaw `VITE_CONVEX_URL`, zeby wlaczyc widok programu
                podopiecznego i autoryzowane odczyty przypisan.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function formatTarget(target: SetTarget) {
  const parts = []

  if (target.weightKg !== undefined) {
    parts.push(`${target.weightKg} kg`)
  }

  if (target.reps !== undefined) {
    parts.push(`${target.reps} powt.`)
  } else if (target.repsMin !== undefined && target.repsMax !== undefined) {
    parts.push(`${target.repsMin}-${target.repsMax} powt.`)
  }

  if (target.durationSeconds !== undefined) {
    parts.push(formatDuration(target.durationSeconds))
  }

  if (target.distanceMeters !== undefined) {
    parts.push(`${target.distanceMeters} m`)
  }

  if (target.targetRpe !== undefined) {
    parts.push(`RPE ${target.targetRpe}`)
  }

  return parts.length > 0 ? parts.join(' / ') : 'Cel serii nie zostal uzupelniony'
}

function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds} sek.`
  }

  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60

  return restSeconds > 0 ? `${minutes} min ${restSeconds} sek.` : `${minutes} min`
}
