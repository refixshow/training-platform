import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  CloudOff,
  ClipboardCheck,
  Dumbbell,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Save,
} from 'lucide-react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import { getExerciseEquipmentLabel, getExerciseTypeLabel } from '#/entities/exercise'
import type { ExerciseType } from '#/entities/exercise'
import {
  formatTrainingDate,
  formatTrainingDuration,
  formatVolumeKg,
  getTrainingResultFieldLabel,
  getTrainingResultFields,
  getTrainingResultFieldUnit,
  parseOptionalNumber,
  type TrainingResultField,
  type TrainingSetResultFormValues,
  type TrainingSubmissionFormValues,
} from '#/entities/training-result'
import {
  createTrainingSubmissionValues,
  getCompletedSetResults,
  hasSetResultInput,
  validateTrainingSubmissionValues,
} from '#/features/submit-training-result'
import {
  applyTrainingDraftToValues,
  createTrainingDraftSnapshot,
  getTrainingDraftStatusCopy,
  getTrainingDraftStatusTone,
  type TrainingDraftSaveState,
} from '#/features/manage-training-draft'
import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardHeader, CardNotice } from '#/shared/ui/card'
import { FormField, getFieldA11y } from '#/shared/ui/form-field'
import { Input, Textarea } from '#/shared/ui/input'
import { StatusMessage } from '#/shared/ui/status-message'

type LoggingRoutine = FunctionReturnType<
  typeof api.trainingResults.getLoggingRoutine
>
type RoutineBlock = LoggingRoutine['routine']['blocks'][number]
type SetTarget = RoutineBlock['setTargets'][number]
type SubmitResult = FunctionReturnType<typeof api.trainingResults.submit>
type TrainingDraft = FunctionReturnType<typeof api.trainingResults.getOrCreateDraft>

interface WorkoutLoggingProps {
  assignmentId?: string
  routineId?: string
}

export function WorkoutLogging({ assignmentId, routineId }: WorkoutLoggingProps) {
  if (!hasConfiguredConvexUrl()) {
    return <SetupState />
  }

  if (!assignmentId || !routineId) {
    return <MissingRouteState />
  }

  return (
    <ConnectedWorkoutLogging
      assignmentId={assignmentId as Id<'programAssignments'>}
      routineId={routineId as Id<'routines'>}
    />
  )
}

function ConnectedWorkoutLogging({
  assignmentId,
  routineId,
}: {
  assignmentId: Id<'programAssignments'>
  routineId: Id<'routines'>
}) {
  const routineQuery = useQuery(
    convexQuery(api.trainingResults.getLoggingRoutine, {
      assignmentId,
      routineId,
    }),
  )
  const getOrCreateDraft = useMutation(api.trainingResults.getOrCreateDraft)
  const updateDraft = useMutation(api.trainingResults.updateDraft)
  const submitTraining = useMutation(api.trainingResults.submit)
  const loggingRoutine = routineQuery.data
  const [values, setValues] = useState<TrainingSubmissionFormValues>(() => ({
    durationMinutes: '',
    notes: '',
    setResults: [],
  }))
  const valuesRef = useRef(values)
  const lastSyncedSnapshotRef = useRef<string | null>(null)
  const [draft, setDraft] = useState<TrainingDraft | null>(null)
  const [draftState, setDraftState] = useState<TrainingDraftSaveState>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined)
  const [isRestoringDraft, setIsRestoringDraft] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)

  useEffect(() => {
    valuesRef.current = values
  }, [values])

  const lastSyncedValuesRef = useRef<TrainingSubmissionFormValues | null>(null)

  useEffect(() => {
    if (!loggingRoutine) {
      return
    }

    let isCancelled = false
    const baseValues = createTrainingSubmissionValues(loggingRoutine.routine.blocks)

    setValues(baseValues)
    setDraft(null)
    setDraftState('saved')
    setLastSavedAt(undefined)
    setSubmitError(null)
    setSubmitResult(null)
    setIsSubmitting(false)
    setIsRestoringDraft(true)
    lastSyncedValuesRef.current = null

    getOrCreateDraft({ assignmentId, routineId })
      .then((restoredDraft) => {
        if (isCancelled) {
          return
        }

        const restoredValues = applyTrainingDraftToValues(baseValues, restoredDraft)
        const snapshot = createTrainingDraftSnapshot(restoredValues)

        setDraft(restoredDraft)
        setValues(restoredValues)
        setLastSavedAt(restoredDraft.lastSavedAt)
        setDraftState(
          restoredDraft.setResults.length > 0 ||
            restoredDraft.durationMinutes !== undefined ||
            Boolean(restoredDraft.notes)
            ? 'restored'
            : 'saved',
        )
        lastSyncedSnapshotRef.current = snapshot
        lastSyncedValuesRef.current = restoredValues
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setDraftState('failed')
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Nie udalo sie przywrocic szkicu treningu.',
        )
        lastSyncedSnapshotRef.current = createTrainingDraftSnapshot(baseValues)
        lastSyncedValuesRef.current = baseValues
      })
      .finally(() => {
        if (!isCancelled) {
          setIsRestoringDraft(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [assignmentId, getOrCreateDraft, loggingRoutine, routineId])

  const exerciseTypeByBlockId = useMemo(() => {
    const map = new Map<string, ExerciseType>()

    for (const block of loggingRoutine?.routine.blocks ?? []) {
      map.set(block._id, block.exercise.type)
    }

    return map
  }, [loggingRoutine])
  const errors = useMemo(
    () => validateTrainingSubmissionValues(values, exerciseTypeByBlockId),
    [exerciseTypeByBlockId, values],
  )
  const completedRows = useMemo(() => getCompletedSetResults(values), [values])
  const totalSetCount = values.setResults.length
  const canSubmit =
    completedRows.length > 0 &&
    Object.keys(errors).length === 0 &&
    !submitResult &&
    !isRestoringDraft &&
    !isSubmitting
  const submitBlockReason = getSubmitBlockReason({
    completedSetCount: completedRows.length,
    errors,
    isRestoringDraft,
    isSubmitting,
    submitResult,
  })
  const hasUnsyncedDraftState = isUnsyncedDraftState(draftState)

  const saveDraft = useCallback(
    async (snapshotValues: TrainingSubmissionFormValues) => {
      if (!draft) {
        return null
      }

      const snapshot = createTrainingDraftSnapshot(snapshotValues)

      setDraftState('saving')

      const updatedDraft = await updateDraft({
        assignmentId,
        draftId: draft._id,
        durationMinutes: parseDraftOptionalNumber(snapshotValues.durationMinutes),
        notes: snapshotValues.notes,
        routineId,
        setResults: getChangedDraftRows(
          snapshotValues,
          lastSyncedValuesRef.current,
        ).map((row) =>
          toDraftSet(row, exerciseTypeByBlockId.get(row.routineExerciseBlockId)),
        ),
      })
      const latestSnapshot = createTrainingDraftSnapshot(valuesRef.current)

      setDraft(updatedDraft)
      setLastSavedAt(updatedDraft.lastSavedAt)
      lastSyncedSnapshotRef.current = snapshot
      lastSyncedValuesRef.current = snapshotValues
      setDraftState(latestSnapshot === snapshot ? 'saved' : 'unsaved')

      return updatedDraft
    },
    [assignmentId, draft, exerciseTypeByBlockId, routineId, updateDraft],
  )

  useEffect(() => {
    if (!draft || submitResult || isRestoringDraft) {
      return
    }

    const snapshot = createTrainingDraftSnapshot(values)

    if (snapshot === lastSyncedSnapshotRef.current) {
      return
    }

    setDraftState('unsaved')
    const timeoutId = window.setTimeout(() => {
      saveDraft(values)
        .catch(() => {
          setDraftState('failed')
        })
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [
    draft,
    isRestoringDraft,
    saveDraft,
    submitResult,
    values,
  ])

  useBlocker({
    disabled: !hasUnsyncedDraftState,
    enableBeforeUnload: hasUnsyncedDraftState,
    shouldBlockFn: ({ current, next }) => {
      if (current.pathname === next.pathname) {
        return false
      }

      return !window.confirm(
        'Szkic ma zmiany, ktore nie sa jeszcze zapisane w Convexie. Opuscic trening mimo to?',
      )
    },
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    if (!loggingRoutine) {
      return
    }

    const currentErrors = validateTrainingSubmissionValues(values, exerciseTypeByBlockId)
    const firstError = Object.values(currentErrors)[0]

    if (firstError) {
      setSubmitError(firstError)
      return
    }

    try {
      setIsSubmitting(true)

      if (draft) {
        await saveDraft(values)
      }

      const result = await submitTraining({
        assignmentId,
        draftId: draft?._id,
        durationMinutes: draft ? undefined : parseOptionalNumber(values.durationMinutes),
        notes: draft ? undefined : values.notes,
        routineId,
        setResults: draft
          ? undefined
          : completedRows.map((row) =>
              toSubmittedSet(row, exerciseTypeByBlockId.get(row.routineExerciseBlockId)),
            ),
      })
      setSubmitResult(result)
      setDraftState('saved')
    } catch (error) {
      setDraftState(draft ? 'failed' : draftState)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Nie udalo sie zapisac treningu. Sprobuj ponownie.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateSetResult = useCallback((
    rowIndex: number,
    field: TrainingResultField,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      setResults: current.setResults.map((row, index) => {
        if (index !== rowIndex) {
          return row
        }

        const nextRow = {
          ...row,
          [field]: value,
        }

        return {
          ...nextRow,
          completed: nextRow.completed || hasSetResultInput(nextRow),
        }
      }),
    }))
  }, [])

  const toggleSetResult = useCallback((rowIndex: number) => {
    setValues((current) => ({
      ...current,
      setResults: current.setResults.map((row, index) =>
        index === rowIndex ? { ...row, completed: !row.completed } : row,
      ),
    }))
  }, [])

  const handleRetryDraftSave = useCallback(async () => {
    try {
      setSubmitError(null)
      await saveDraft(valuesRef.current)
    } catch (error) {
      setDraftState('failed')
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Nie udalo sie ponownie zapisac szkicu.',
      )
    }
  }, [saveDraft])

  if (routineQuery.isPending) {
    return <WorkoutLoggingSkeleton />
  }

  if (routineQuery.error) {
    return <WorkoutLoggingError error={routineQuery.error} />
  }

  if (!loggingRoutine || isRestoringDraft) {
    return <WorkoutLoggingSkeleton />
  }

  if (submitResult) {
    return (
      <SuccessState
        result={submitResult}
        routineName={loggingRoutine.routine.name}
      />
    )
  }

  if (loggingRoutine.routine.blocks.length === 0) {
    return <EmptyRoutineState routineName={loggingRoutine.routine.name} />
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
      <WorkoutHeader
        completedSetCount={completedRows.length}
        loggingRoutine={loggingRoutine}
        totalSetCount={totalSetCount}
      />
      <DraftSaveStatus lastSavedAt={lastSavedAt} state={draftState} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <section aria-label="Cwiczenia do zapisania" className="grid gap-4">
          {loggingRoutine.routine.blocks.map((block, blockIndex) => (
            <ExerciseLoggingBlock
              block={block}
              blockIndex={blockIndex}
              errors={errors}
              key={block._id}
              onToggleSetResult={toggleSetResult}
              onUpdateSetResult={updateSetResult}
              values={values}
            />
          ))}
        </section>

        <TrainingReviewPanel
          completedRows={completedRows}
          draftState={draftState}
          error={submitError}
          errors={errors}
          onChangeValues={setValues}
          onRetryDraftSave={handleRetryDraftSave}
          totalSetCount={totalSetCount}
          values={values}
        />
      </div>

      <div className="sticky bottom-24 z-10 rounded-lg border border-border bg-card p-4 shadow-sm sm:bottom-3">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-foreground">
              <span>{completedRows.length} zapisanych serii</span>
              <span>{totalSetCount} serii w planie</span>
            </div>
            <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
              {submitBlockReason ??
                'Szkic zapisuje sie w Convexie. Wynik bedzie widoczny dla Ciebie i coacha po zapisie.'}
            </p>
          </div>

          <Button disabled={!canSubmit} size="lg" type="submit">
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-4 w-4" />
            )}
            {isSubmitting ? 'Zapisywanie...' : 'Zapisz trening'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function WorkoutHeader({
  completedSetCount,
  loggingRoutine,
  totalSetCount,
}: {
  completedSetCount: number
  loggingRoutine: LoggingRoutine
  totalSetCount: number
}) {
  const progressLabel =
    totalSetCount > 0
      ? `${completedSetCount}/${totalSetCount} serii`
      : 'Brak serii'

  return (
    <header className="sticky top-16 z-10 -mx-4 border-b border-border bg-background/95 px-4 pb-4 pt-1 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          to="/my-program"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Moj program
        </Link>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {loggingRoutine.program.title}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
            {loggingRoutine.routine.name}
          </h1>
        </div>

        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs font-bold text-muted-foreground">Postep</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {progressLabel}
          </p>
        </div>
      </div>
    </header>
  )
}

function ExerciseLoggingBlock({
  block,
  blockIndex,
  errors,
  onToggleSetResult,
  onUpdateSetResult,
  values,
}: {
  block: RoutineBlock
  blockIndex: number
  errors: Record<string, string>
  onToggleSetResult: (rowIndex: number) => void
  onUpdateSetResult: (
    rowIndex: number,
    field: TrainingResultField,
    value: string,
  ) => void
  values: TrainingSubmissionFormValues
}) {
  const fields = getTrainingResultFields(block.exercise.type)
  const rows = values.setResults
    .map((row, index) => ({ index, row }))
    .filter(({ row }) => row.routineExerciseBlockId === block._id)
  const hasMedia = hasExerciseMedia(block)

  return (
    <Card>
      <CardHeader>
        <div
          className={
            hasMedia
              ? 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]'
              : 'grid gap-4'
          }
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-muted px-2 text-xs font-bold tabular-nums text-foreground">
                {blockIndex + 1}
              </span>
              <span className="inline-flex rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                {getExerciseTypeLabel(block.exercise.type)}
              </span>
              {block.supersetGroup ? (
                <span className="inline-flex rounded-md border border-border bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
                  Superset {block.supersetGroup}
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-bold text-foreground">
              {block.exercise.name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {getExerciseEquipmentLabel(block.exercise.equipment)}
              {block.exercise.customEquipment
                ? `: ${block.exercise.customEquipment}`
                : ''}
            </p>
          </div>

          {hasMedia ? <ExerciseMedia block={block} /> : null}
        </div>
      </CardHeader>

      <div className="grid">
        {rows.map(({ index, row }) => (
          <SetResultRow
            block={block}
            errors={errors}
            fields={fields}
            key={`${row.routineExerciseBlockId}-${row.setIndex}`}
            onToggle={() => onToggleSetResult(index)}
            onUpdate={(field, value) => onUpdateSetResult(index, field, value)}
            row={row}
            rowIndex={index}
            target={block.setTargets.find(
              (candidate) => candidate.setIndex === row.setIndex,
            )}
          />
        ))}
      </div>

      {block.exercise.instructions.length > 0 ? (
        <CardNotice tone="neutral">
          <details>
            <summary className="cursor-pointer text-sm font-bold text-foreground">
              Wskazowki do cwiczenia
            </summary>
            <ol className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
              {block.exercise.instructions.map((instruction, index) => (
                <li
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2"
                  key={`${instruction}-${index}`}
                >
                  <span className="font-bold tabular-nums text-foreground">
                    {index + 1}.
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </details>
        </CardNotice>
      ) : null}
    </Card>
  )
}

function SetResultRow({
  block,
  errors,
  fields,
  onToggle,
  onUpdate,
  row,
  rowIndex,
  target,
}: {
  block: RoutineBlock
  errors: Record<string, string>
  fields: TrainingResultField[]
  onToggle: () => void
  onUpdate: (field: TrainingResultField, value: string) => void
  row: TrainingSetResultFormValues
  rowIndex: number
  target?: SetTarget
}) {
  return (
    <div
      className={
        row.completed
          ? 'grid gap-3 border-b border-border bg-accent/40 px-4 py-4 last:border-b-0 sm:px-5'
          : 'grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:px-5'
      }
    >
      <div className="grid gap-3 lg:grid-cols-[9rem_minmax(0,1fr)] lg:items-start">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            checked={row.completed}
            className="h-5 w-5 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onChange={onToggle}
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-bold text-foreground">
              Seria {row.setIndex}
            </span>
            <span className="block text-xs font-semibold text-muted-foreground">
              {target ? formatTarget(target) : 'Cel niedostepny'}
            </span>
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fields.map((field) => (
            <FieldInput
              error={errors[`setResults.${rowIndex}.${field}`]}
              field={field}
              key={field}
              onChange={(value) => onUpdate(field, value)}
              rowIndex={rowIndex}
              type={block.exercise.type}
              value={row[field] ?? ''}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FieldInput({
  error,
  field,
  onChange,
  rowIndex,
  type,
  value,
}: {
  error?: string
  field: TrainingResultField
  onChange: (value: string) => void
  rowIndex: number
  type: ExerciseType
  value: string
}) {
  const label = getTrainingResultFieldLabel(field, type)
  const unit = getTrainingResultFieldUnit(field)
  const inputId = `set-${rowIndex}-${field}`
  const errorId = `${inputId}-error`

  return (
    <div className="grid gap-1.5">
      <label
        className="flex items-center justify-between gap-2 text-xs font-bold text-muted-foreground"
        htmlFor={inputId}
      >
        <span>{label}</span>
        <span>{unit}</span>
      </label>
      <Input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        id={inputId}
        inputMode="decimal"
        min={field === 'rpe' ? 1 : 0}
        max={field === 'rpe' ? 10 : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={getTrainingResultFieldPlaceholder(field)}
        step={field === 'reps' ? 1 : 'any'}
        type="number"
        value={value}
      />
      {error ? (
        <p className="text-xs font-medium leading-5 text-destructive" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

function DraftSaveStatus({
  lastSavedAt,
  state,
}: {
  lastSavedAt?: number
  state: TrainingDraftSaveState
}) {
  const tone = getTrainingDraftStatusTone(state)
  const Icon =
    state === 'failed' ? CloudOff : state === 'saving' ? Loader2 : Cloud
  const toneClass =
    tone === 'error'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'border-primary/30 bg-primary/10 text-foreground'
        : 'border-accent/60 bg-accent/35 text-accent-foreground'

  return (
    <section
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${toneClass}`}
    >
      <Icon
        aria-hidden="true"
        className={
          state === 'saving'
            ? 'mt-0.5 h-4 w-4 shrink-0 animate-spin'
            : 'mt-0.5 h-4 w-4 shrink-0'
        }
      />
      <p className="leading-5">{getTrainingDraftStatusCopy(state, lastSavedAt)}</p>
    </section>
  )
}

function TrainingReviewPanel({
  completedRows,
  draftState,
  error,
  errors,
  onChangeValues,
  onRetryDraftSave,
  totalSetCount,
  values,
}: {
  completedRows: TrainingSetResultFormValues[]
  draftState: TrainingDraftSaveState
  error: string | null
  errors: Record<string, string>
  onChangeValues: React.Dispatch<React.SetStateAction<TrainingSubmissionFormValues>>
  onRetryDraftSave: () => void
  totalSetCount: number
  values: TrainingSubmissionFormValues
}) {
  const formError = error ?? errors.form

  return (
    <aside className="grid gap-4 xl:sticky xl:top-40">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ClipboardCheck aria-hidden="true" className="h-4 w-4 text-primary" />
            Podsumowanie
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Sprawdz zapis przed wyslaniem. Wynik trafi do historii i widoku coacha.
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4">
            <FormField
              error={errors.durationMinutes}
              hint="Minuty"
              label="Czas treningu"
              name="duration-minutes"
            >
              <Input
                id="duration-minutes"
                inputMode="decimal"
                min={0}
                onChange={(event) =>
                  onChangeValues((current) => ({
                    ...current,
                    durationMinutes: event.target.value,
                  }))
                }
                placeholder="Np. 55"
                type="number"
                value={values.durationMinutes}
                {...getFieldA11y('duration-minutes', errors.durationMinutes, {
                  hasHint: true,
                })}
              />
            </FormField>

            <FormField label="Notatka po treningu" name="training-notes">
              <Textarea
                id="training-notes"
                onChange={(event) =>
                  onChangeValues((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Opcjonalnie: energia, bol, trudnosc, komentarz dla coacha."
                value={values.notes}
              />
            </FormField>

            <dl className="grid grid-cols-2 gap-3">
              <SummaryFact label="Zapisane" value={`${completedRows.length}`} />
              <SummaryFact label="W planie" value={`${totalSetCount}`} />
            </dl>

            {completedRows.length > 0 && completedRows.length < totalSetCount ? (
              <StatusMessage tone="warning">
                To bedzie czesciowy trening. Do wyniku trafia tylko uzupelnione serie.
              </StatusMessage>
            ) : null}

            {draftState === 'failed' ? (
              <div className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <StatusMessage tone="error">
                  Ostatni autosave nie przeszedl. Przed zamknieciem strony sprobuj ponownie zapisac szkic.
                </StatusMessage>
                <Button onClick={onRetryDraftSave} size="sm" type="button" variant="secondary">
                  <Cloud aria-hidden="true" className="h-4 w-4" />
                  Zapisz szkic ponownie
                </Button>
              </div>
            ) : null}

            {formError ? <StatusMessage tone="error">{formError}</StatusMessage> : null}
          </div>
        </CardBody>
      </Card>
    </aside>
  )
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function ExerciseMedia({ block }: { block: RoutineBlock }) {
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
          Wideo
        </a>
      ) : null}
    </div>
  )
}

function hasExerciseMedia(block: RoutineBlock) {
  return Boolean(block.exercise.photoUrl || block.exercise.videoUrl)
}

function getTrainingResultFieldPlaceholder(field: TrainingResultField) {
  switch (field) {
    case 'distanceMeters':
      return 'Np. 800'
    case 'durationSeconds':
      return 'Np. 45'
    case 'reps':
      return 'Np. 10'
    case 'rpe':
      return '1-10'
    case 'weightKg':
      return 'Np. 20'
  }
}

function SuccessState({
  result,
  routineName,
}: {
  result: NonNullable<SubmitResult>
  routineName: string
}) {
  return (
    <section className="grid min-h-[calc(100vh-8rem)] place-items-center">
      <Card>
        <CardBody padding="lg">
          <div className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-foreground">
              Trening zapisany
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {routineName} jest gotowy do historii wynikow i podgladu coacha.
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <SummaryFact label="Serie" value={`${result.completedSets}`} />
              <SummaryFact label="Wolumen" value={formatVolumeKg(result.volumeKg)} />
              <SummaryFact label="Data" value={formatTrainingDate(result.completedAt)} />
            </dl>
            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              to="/my-program"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Wroc do programu
            </Link>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function MissingRouteState() {
  return (
    <StateFrame
      icon={FileText}
      title="Wybierz trening z programu"
      tone="info"
    >
      Przejdz do widoku programu i uruchom konkretna rutyne, zeby zapis byl
      powiazany z przypisaniem.
    </StateFrame>
  )
}

function EmptyRoutineState({ routineName }: { routineName: string }) {
  return (
    <StateFrame icon={Dumbbell} title="Ta rutyna jest pusta" tone="info">
      {routineName} nie ma jeszcze cwiczen ani serii. Wroc do programu i wybierz
      inna rutyne albo poczekaj na uzupelnienie przez coacha.
    </StateFrame>
  )
}

function WorkoutLoggingError({ error }: { error: Error }) {
  const isAccessError = error.message.toLocaleLowerCase('pl-PL').includes('dostep')

  return (
    <StateFrame
      icon={isAccessError ? Lock : AlertCircle}
      title={
        isAccessError
          ? 'Nie masz dostepu do tego treningu'
          : 'Nie mozemy pobrac treningu'
      }
      tone={isAccessError ? 'warning' : 'error'}
    >
      Odswiez strone albo wroc do programu. Szczegoly: {error.message}
    </StateFrame>
  )
}

function SetupState() {
  return (
    <StateFrame icon={AlertCircle} title="Convex nie jest podlaczony" tone="warning">
      Ustaw `VITE_CONVEX_URL`, zeby wlaczyc zapis wynikow treningu.
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
  tone: 'error' | 'info' | 'warning'
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
              <Link
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                to="/my-program"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Moj program
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function WorkoutLoggingSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Ladowanie treningu"
      className="grid animate-pulse gap-5"
    >
      <header className="border-b border-border pb-5">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="mt-3 h-9 max-w-xl rounded-md bg-muted" />
        <div className="mt-4 h-20 rounded-lg border border-border bg-card" />
      </header>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="h-72 rounded-lg border border-border bg-card p-5" key={index}>
              <div className="h-5 w-40 rounded-md bg-muted" />
              <div className="mt-4 h-8 max-w-md rounded-md bg-muted" />
              <div className="mt-6 grid gap-3">
                <div className="h-16 rounded-md bg-muted" />
                <div className="h-16 rounded-md bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-80 rounded-lg border border-border bg-card p-5">
          <div className="h-5 w-36 rounded-md bg-muted" />
          <div className="mt-4 h-11 rounded-md bg-muted" />
          <div className="mt-4 h-32 rounded-md bg-muted" />
        </div>
      </div>
    </section>
  )
}

function isUnsyncedDraftState(state: TrainingDraftSaveState) {
  return state === 'failed' || state === 'saving' || state === 'unsaved'
}

function getSubmitBlockReason({
  completedSetCount,
  errors,
  isRestoringDraft,
  isSubmitting,
  submitResult,
}: {
  completedSetCount: number
  errors: Record<string, string>
  isRestoringDraft: boolean
  isSubmitting: boolean
  submitResult: SubmitResult | null
}) {
  if (submitResult) {
    return 'Ten trening zostal juz zapisany.'
  }

  if (isSubmitting) {
    return 'Zapisujemy trening. Nie klikaj ponownie.'
  }

  if (isRestoringDraft) {
    return 'Przywracamy zapisany szkic treningu.'
  }

  if (completedSetCount === 0) {
    return 'Oznacz i uzupelnij przynajmniej jedna serie, zeby zapisac trening.'
  }

  const firstError = Object.values(errors)[0]

  if (firstError) {
    return firstError
  }

  return null
}

function getChangedDraftRows(
  values: TrainingSubmissionFormValues,
  syncedValues: TrainingSubmissionFormValues | null,
) {
  if (!syncedValues) {
    return values.setResults
  }

  const syncedRowsByKey = new Map(
    syncedValues.setResults.map((row) => [
      getTrainingSetResultKey(row),
      getTrainingSetResultSnapshot(row),
    ]),
  )

  return values.setResults.filter((row) => {
    const syncedRow = syncedRowsByKey.get(getTrainingSetResultKey(row))

    return syncedRow !== getTrainingSetResultSnapshot(row)
  })
}

function getTrainingSetResultKey(row: {
  routineExerciseBlockId: string
  setIndex: number
}) {
  return `${row.routineExerciseBlockId}:${row.setIndex}`
}

function getTrainingSetResultSnapshot(row: TrainingSetResultFormValues) {
  return JSON.stringify({
    completed: row.completed,
    distanceMeters: row.distanceMeters,
    durationSeconds: row.durationSeconds,
    exerciseId: row.exerciseId,
    reps: row.reps,
    routineExerciseBlockId: row.routineExerciseBlockId,
    rpe: row.rpe,
    setIndex: row.setIndex,
    weightKg: row.weightKg,
  })
}

function toSubmittedSet(
  row: TrainingSetResultFormValues,
  type?: ExerciseType,
) {
  const fields = type ? getTrainingResultFields(type) : []

  return {
    distanceMeters: fields.includes('distanceMeters')
      ? parseDraftOptionalNumber(row.distanceMeters)
      : undefined,
    durationSeconds: fields.includes('durationSeconds')
      ? parseDraftOptionalNumber(row.durationSeconds)
      : undefined,
    exerciseId: row.exerciseId as Id<'exercises'>,
    reps: fields.includes('reps') ? parseDraftOptionalNumber(row.reps) : undefined,
    routineExerciseBlockId: row.routineExerciseBlockId as Id<'routineExerciseBlocks'>,
    rpe: parseDraftOptionalNumber(row.rpe),
    setIndex: row.setIndex,
    weightKg: fields.includes('weightKg')
      ? parseDraftOptionalNumber(row.weightKg)
      : undefined,
  }
}

function toDraftSet(
  row: TrainingSetResultFormValues,
  type?: ExerciseType,
) {
  return {
    ...toSubmittedSet(row, type),
    completed: row.completed,
  }
}

function parseDraftOptionalNumber(value?: string) {
  const parsed = parseOptionalNumber(value)

  return Number.isNaN(parsed) ? undefined : parsed
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
    parts.push(formatTrainingDuration(target.durationSeconds))
  }

  if (target.distanceMeters !== undefined) {
    parts.push(`${target.distanceMeters} m`)
  }

  if (target.targetRpe !== undefined) {
    parts.push(`RPE ${target.targetRpe}`)
  }

  return parts.length > 0 ? parts.join(' / ') : 'Cel nieuzupelniony'
}
