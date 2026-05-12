import { useMemo, useState } from 'react'
import type { FormikErrors } from 'formik'
import { useFormik } from 'formik'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronsUpDown,
  Dumbbell,
  Link as LinkIcon,
  ListChecks,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import {
  getExerciseTypeIcon,
  getExerciseTypeLabel,
  type ExerciseType,
} from '#/entities/exercise'
import {
  createEmptySetTarget,
  createRoutineBlock,
  emptyRoutineFormValues,
  formatRoutineDate,
  getSetTargetFields,
  parseOptionalNumber,
  routineFormSchema,
  type RoutineBlockFormValues,
  type RoutineFormValues,
  type RoutineSetTargetFormValues,
} from '#/entities/routine'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardHeader, CardNotice } from '#/shared/ui/card'
import { Input, Select } from '#/shared/ui/input'

type ExerciseWithMuscles = Doc<'exercises'> & {
  primaryMuscleGroup: Doc<'muscleGroups'> | null
  secondaryMuscleGroups: Doc<'muscleGroups'>[]
}

type RoutineListItem = Doc<'routines'> & {
  exerciseCount: number
  programUsageCount: number
  setCount: number
}

type RoutineDetails = Doc<'routines'> & {
  blocks: Array<
    Doc<'routineExerciseBlocks'> & {
      exercise: Doc<'exercises'> | null
      setTargets: Doc<'routineSetTargets'>[]
    }
  >
}

type EditorMode =
  | { kind: 'idle' }
  | { kind: 'create' }
  | { id: Id<'routines'>; kind: 'edit' }

export function RoutineBuilder() {
  if (!import.meta.env.VITE_CONVEX_URL) {
    return <RoutineBuilderSetupState />
  }

  return <ConnectedRoutineBuilder />
}

function ConnectedRoutineBuilder() {
  const [mode, setMode] = useState<EditorMode>({ kind: 'idle' })
  const [search, setSearch] = useState('')
  const authQuery = useQuery(convexQuery(api.auth.currentCoachAdmin, {}))
  const canManageRoutines = Boolean(authQuery.data)
  const routinesQuery = useQuery(
    convexQuery(
      api.routines.list,
      canManageRoutines ? { limit: 100 } : 'skip',
    ),
  )
  const exercisesQuery = useQuery(
    convexQuery(
      api.exercises.list,
      canManageRoutines ? { limit: 100 } : 'skip',
    ),
  )
  const routineDetailsQuery = useQuery(
    convexQuery(
      api.routines.get,
      mode.kind === 'edit' ? { routineId: mode.id } : 'skip',
    ),
  )

  const routines = (routinesQuery.data ?? []) as RoutineListItem[]
  const exercises = (exercisesQuery.data ?? []) as ExerciseWithMuscles[]
  const queryError = authQuery.error ?? routinesQuery.error ?? exercisesQuery.error
  const normalizedSearch = search.trim().toLowerCase()

  const filteredRoutines = useMemo(() => {
    if (!normalizedSearch) {
      return routines
    }

    return routines.filter((routine) =>
      routine.name.toLowerCase().includes(normalizedSearch),
    )
  }, [normalizedSearch, routines])

  const selectedRoutine =
    mode.kind === 'edit'
      ? routines.find((routine) => routine._id === mode.id) ?? null
      : null

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Panel trenera</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
            Rutyny
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Komponuj powtarzalne jednostki treningowe z biblioteki cwiczen.
            Kazda seria przechowuje tylko pola potrzebne dla typu cwiczenia.
          </p>
        </div>

        <Button
          disabled={!canManageRoutines || exercises.length === 0}
          onClick={() => setMode({ kind: 'create' })}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Dodaj rutyne
        </Button>
      </header>

      {authQuery.isPending ? (
        <RoutineEditorSkeleton />
      ) : queryError ? (
        <RoutineQueryError error={queryError} />
      ) : !canManageRoutines ? (
        <CoachAuthRequiredState />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListChecks aria-hidden="true" className="h-4 w-4 text-primary" />
                Biblioteka rutyn
              </div>
              <label className="relative">
                <span className="sr-only">Szukaj rutyny</span>
                <Input
                  leadingIcon={<Search aria-hidden="true" className="h-4 w-4" />}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Szukaj po nazwie"
                  value={search}
                />
              </label>
            </CardHeader>

            {routinesQuery.isPending ? (
              <RoutineListSkeleton />
            ) : routines.length === 0 ? (
              <RoutineEmptyState
                canCreate={exercises.length > 0}
                onCreate={() => setMode({ kind: 'create' })}
              />
            ) : filteredRoutines.length === 0 ? (
              <RoutineNoResults onReset={() => setSearch('')} />
            ) : (
              <RoutineList
                routines={filteredRoutines}
                selectedId={selectedRoutine?._id ?? null}
                onCreate={() => setMode({ kind: 'create' })}
                onSelect={(id) => setMode({ id, kind: 'edit' })}
              />
            )}
          </Card>

          <div className="min-w-0">
            {exercisesQuery.isPending ? (
              <RoutineEditorSkeleton />
            ) : exercises.length === 0 ? (
              <NoExercisesState />
            ) : mode.kind === 'idle' ? (
              <RoutineIdleState onCreate={() => setMode({ kind: 'create' })} />
            ) : mode.kind === 'edit' && routineDetailsQuery.isPending ? (
              <RoutineEditorSkeleton />
            ) : mode.kind === 'edit' && routineDetailsQuery.error ? (
              <RoutineQueryError error={routineDetailsQuery.error} />
            ) : (
              <RoutineEditor
                exercises={exercises}
                initialValues={
                  mode.kind === 'edit' && routineDetailsQuery.data
                    ? detailsToFormValues(routineDetailsQuery.data as RoutineDetails)
                    : emptyRoutineFormValues
                }
                mode={mode}
                onCancel={() => setMode({ kind: 'idle' })}
                onSaved={(routineId) => setMode({ id: routineId, kind: 'edit' })}
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function RoutineList({
  onCreate,
  onSelect,
  routines,
  selectedId,
}: {
  onCreate: () => void
  onSelect: (id: Id<'routines'>) => void
  routines: RoutineListItem[]
  selectedId: Id<'routines'> | null
}) {
  return (
    <div className="grid gap-0">
      {routines.map((routine) => (
        <button
          className={
            selectedId === routine._id
              ? 'grid gap-3 border-b border-border bg-accent/60 p-4 text-left last:border-b-0'
              : 'grid gap-3 border-b border-border p-4 text-left transition-colors hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring last:border-b-0'
          }
          key={routine._id}
          onClick={() => onSelect(routine._id)}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-foreground">
                {routine.name}
              </h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {formatRoutineDate(routine.updatedAt ?? routine.createdAt)}
              </p>
            </div>
            {routine.programUsageCount > 0 ? (
              <span className="rounded-md bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
                w programie
              </span>
            ) : null}
          </div>

          <dl className="grid grid-cols-3 gap-2 text-xs">
            <Metric label="Cwiczenia" value={routine.exerciseCount} />
            <Metric label="Serie" value={routine.setCount} />
            <Metric label="Uzycia" value={routine.programUsageCount} />
          </dl>
        </button>
      ))}

      <div className="p-4">
        <Button onClick={onCreate} variant="secondary">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nowa rutyna
        </Button>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-bold text-foreground">{value}</dd>
    </div>
  )
}

function RoutineEditor({
  exercises,
  initialValues,
  mode,
  onCancel,
  onSaved,
}: {
  exercises: ExerciseWithMuscles[]
  initialValues: RoutineFormValues
  mode: Exclude<EditorMode, { kind: 'idle' }>
  onCancel: () => void
  onSaved: (routineId: Id<'routines'>) => void
}) {
  const createRoutine = useMutation(api.routines.create)
  const updateRoutine = useMutation(api.routines.update)
  const removeRoutine = useMutation(api.routines.remove)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise._id, exercise])),
    [exercises],
  )

  const formik = useFormik<RoutineFormValues>({
    enableReinitialize: true,
    initialValues,
    validate: (values) => validateRoutineForm(values, exercisesById),
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null)
      setSubmitSuccess(null)

      try {
        const payload = buildRoutinePayload(values)
        const routineId =
          mode.kind === 'create'
            ? await createRoutine(payload)
            : await updateRoutine({
                routineId: mode.id,
                ...payload,
              })

        setSubmitSuccess('Rutyna zostala zapisana.')
        onSaved(routineId)
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Nie udalo sie zapisac rutyny. Sprobuj ponownie.',
        )
      } finally {
        helpers.setSubmitting(false)
      }
    },
  })

  const exerciseCount = formik.values.blocks.length
  const setCount = formik.values.blocks.reduce(
    (count, block) => count + block.setTargets.length,
    0,
  )
  const validationSummary =
    typeof formik.errors.blocks === 'string'
      ? formik.errors.blocks
      : formik.errors.name

  async function handleDelete() {
    if (mode.kind !== 'edit') {
      return
    }

    setDeleteError(null)
    try {
      await removeRoutine({ routineId: mode.id })
      onCancel()
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Nie udalo sie usunac rutyny. Sprobuj ponownie.',
      )
    }
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={formik.handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Dumbbell aria-hidden="true" className="h-4 w-4" />
                {mode.kind === 'create' ? 'Nowa rutyna' : 'Edycja rutyny'}
              </div>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Struktura treningu
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Dodaj cwiczenia w kolejnosci wykonania. Pola serii zmieniaja
                sie automatycznie po wyborze typu cwiczenia.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onCancel} type="button" variant="secondary">
                Zamknij
              </Button>
              {mode.kind === 'edit' ? (
                <Button onClick={handleDelete} type="button" variant="ghost">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Usun
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardBody>
          <div className="grid gap-5">
            <Field
              error={typeof formik.errors.name === 'string' ? formik.errors.name : undefined}
              label="Nazwa rutyny"
              name="routine-name"
            >
              <Input
                disabled={formik.isSubmitting}
                id="routine-name"
                name="name"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                placeholder="Np. Dol ciala A"
                value={formik.values.name}
              />
            </Field>

            <div className="grid gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Bloki cwiczen
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Uzyj przyciskow gora/dol, zeby ustawic kolejnosc bez
                    przeciagania.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const firstExercise = exercises[0]
                    if (!firstExercise) {
                      return
                    }

                    void formik.setFieldValue('blocks', [
                      ...formik.values.blocks,
                      createRoutineBlock(firstExercise._id, firstExercise.type),
                    ])
                  }}
                  type="button"
                  variant="secondary"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Dodaj cwiczenie
                </Button>
              </div>

              {formik.values.blocks.length === 0 ? (
                <CardNotice>
                  Rutyna musi miec przynajmniej jedno cwiczenie i jedna serie,
                  zanim bedzie gotowa do zapisania.
                </CardNotice>
              ) : null}

              <div className="grid gap-4">
                {formik.values.blocks.map((block, blockIndex) => (
                  <RoutineExerciseBlockEditor
                    block={block}
                    blockIndex={blockIndex}
                    disabled={formik.isSubmitting}
                    exercises={exercises}
                    exercisesById={exercisesById}
                    key={blockIndex}
                    onChange={(nextBlock) => {
                      const blocks = [...formik.values.blocks]
                      blocks[blockIndex] = nextBlock
                      void formik.setFieldValue('blocks', blocks)
                    }}
                    onMove={(direction) => {
                      const targetIndex = blockIndex + direction
                      if (
                        targetIndex < 0 ||
                        targetIndex >= formik.values.blocks.length
                      ) {
                        return
                      }

                      const blocks = [...formik.values.blocks]
                      const current = blocks[blockIndex]
                      const target = blocks[targetIndex]
                      if (!current || !target) {
                        return
                      }
                      blocks[blockIndex] = target
                      blocks[targetIndex] = current
                      void formik.setFieldValue('blocks', blocks)
                    }}
                    onRemove={() => {
                      void formik.setFieldValue(
                        'blocks',
                        formik.values.blocks.filter((_, index) => index !== blockIndex),
                      )
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="sticky bottom-4 z-10 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-1">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-foreground">
                {exerciseCount} cwiczen
              </span>
              <span className="font-semibold text-foreground">
                {setCount} serii roboczych
              </span>
            </div>
            <div aria-live="polite" className="min-h-5">
              {validationSummary ? (
                <StatusMessage tone="error">{validationSummary}</StatusMessage>
              ) : submitError ? (
                <StatusMessage tone="error">{submitError}</StatusMessage>
              ) : deleteError ? (
                <StatusMessage tone="error">{deleteError}</StatusMessage>
              ) : submitSuccess ? (
                <StatusMessage tone="success">{submitSuccess}</StatusMessage>
              ) : (
                <p className="text-xs font-medium text-muted-foreground">
                  Zapis sprawdzi nazwe, cwiczenia i pola serii po stronie Convex.
                </p>
              )}
            </div>
          </div>

          <Button disabled={formik.isSubmitting} type="submit">
            <Save aria-hidden="true" className="h-4 w-4" />
            {formik.isSubmitting ? 'Zapisywanie...' : 'Zapisz rutyne'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function RoutineExerciseBlockEditor({
  block,
  blockIndex,
  disabled,
  exercises,
  exercisesById,
  onChange,
  onMove,
  onRemove,
}: {
  block: RoutineBlockFormValues
  blockIndex: number
  disabled: boolean
  exercises: ExerciseWithMuscles[]
  exercisesById: Map<string, ExerciseWithMuscles>
  onChange: (block: RoutineBlockFormValues) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  const exercise = exercisesById.get(block.exerciseId)
  const Icon = getExerciseTypeIcon(exercise?.type ?? 'weight_reps')

  return (
    <section className="rounded-md border border-border bg-background">
      <div className="grid gap-4 border-b border-border p-4 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] lg:items-end">
        <Field label={`Cwiczenie ${blockIndex + 1}`} name={`exercise-${blockIndex}`}>
          <Select
            disabled={disabled}
            onChange={(event) => {
              const nextExercise = exercisesById.get(event.target.value)
              onChange({
                ...block,
                exerciseId: event.target.value,
                setTargets: block.setTargets.map(() =>
                  createEmptySetTarget(nextExercise?.type),
                ),
              })
            }}
            value={block.exerciseId}
          >
            {exercises.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Przerwa (s)" name={`rest-${blockIndex}`}>
          <Input
            disabled={disabled}
            min={0}
            onChange={(event) =>
              onChange({ ...block, restSeconds: event.target.value })
            }
            type="number"
            value={block.restSeconds ?? ''}
          />
        </Field>

        <Field label="Superset" name={`superset-${blockIndex}`}>
          <Input
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...block, supersetGroup: event.target.value })
            }
            placeholder="A1"
            value={block.supersetGroup ?? ''}
          />
        </Field>

        <div className="flex gap-2">
          <Button onClick={() => onMove(-1)} type="button" variant="ghost">
            <ChevronsUpDown aria-hidden="true" className="h-4 w-4" />
            Gora
          </Button>
          <Button onClick={onRemove} type="button" variant="ghost">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Usun
          </Button>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-foreground">Serie</h4>
              <p className="text-xs font-medium text-muted-foreground">
                {exercise
                  ? getExerciseTypeLabel(exercise.type)
                  : 'Cwiczenie niedostepne'}
              </p>
            </div>
          </div>

          <Button
            onClick={() =>
              onChange({
                ...block,
                setTargets: [
                  ...block.setTargets,
                  createEmptySetTarget(exercise?.type),
                ],
              })
            }
            type="button"
            variant="secondary"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Dodaj serie
          </Button>
        </div>

        {!exercise ? (
          <StatusMessage tone="error">
            To cwiczenie zostalo usuniete albo jest niedostepne. Wybierz inne
            przed zapisem.
          </StatusMessage>
        ) : null}

        <div className="grid gap-2">
          {block.setTargets.map((target, setIndex) => (
            <SetTargetEditor
              disabled={disabled}
              exerciseType={exercise?.type}
              key={setIndex}
              onChange={(nextTarget) => {
                const setTargets = [...block.setTargets]
                setTargets[setIndex] = nextTarget
                onChange({ ...block, setTargets })
              }}
              onRemove={() =>
                onChange({
                  ...block,
                  setTargets: block.setTargets.filter((_, index) => index !== setIndex),
                })
              }
              setIndex={setIndex}
              target={target}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function SetTargetEditor({
  disabled,
  exerciseType,
  onChange,
  onRemove,
  setIndex,
  target,
}: {
  disabled: boolean
  exerciseType?: ExerciseType
  onChange: (target: RoutineSetTargetFormValues) => void
  onRemove: () => void
  setIndex: number
  target: RoutineSetTargetFormValues
}) {
  const fields = getSetTargetFields(exerciseType)

  return (
    <div className="grid gap-3 rounded-md border border-border bg-card p-3 lg:grid-cols-[4rem_minmax(0,1fr)_auto] lg:items-end">
      <div className="text-sm font-bold text-foreground">#{setIndex + 1}</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {fields.includes('weightKg') ? (
          <SmallNumberField
            disabled={disabled}
            label={exerciseType === 'assisted_bodyweight' ? 'Asysta kg' : 'Kg'}
            onChange={(value) => onChange({ ...target, weightKg: value })}
            value={target.weightKg ?? ''}
          />
        ) : null}

        {fields.includes('repsRange') ? (
          <>
            <SmallNumberField
              disabled={disabled}
              label="Reps"
              onChange={(value) =>
                onChange({
                  ...target,
                  reps: value,
                  repsMax: value ? undefined : target.repsMax,
                  repsMin: value ? undefined : target.repsMin,
                })
              }
              value={target.reps ?? ''}
            />
            <SmallNumberField
              disabled={disabled}
              label="Zakres od"
              onChange={(value) =>
                onChange({
                  ...target,
                  reps: value ? undefined : target.reps,
                  repsMin: value,
                })
              }
              value={target.repsMin ?? ''}
            />
            <SmallNumberField
              disabled={disabled}
              label="Zakres do"
              onChange={(value) =>
                onChange({
                  ...target,
                  reps: value ? undefined : target.reps,
                  repsMax: value,
                })
              }
              value={target.repsMax ?? ''}
            />
          </>
        ) : null}

        {fields.includes('durationSeconds') ? (
          <SmallNumberField
            disabled={disabled}
            label="Czas (s)"
            onChange={(value) => onChange({ ...target, durationSeconds: value })}
            value={target.durationSeconds ?? ''}
          />
        ) : null}

        {fields.includes('distanceMeters') ? (
          <SmallNumberField
            disabled={disabled}
            label="Dystans (m)"
            onChange={(value) => onChange({ ...target, distanceMeters: value })}
            value={target.distanceMeters ?? ''}
          />
        ) : null}

        <SmallNumberField
          disabled={disabled}
          label="RPE"
          max={10}
          min={1}
          onChange={(value) => onChange({ ...target, targetRpe: value })}
          value={target.targetRpe ?? ''}
        />
      </div>

      <Button onClick={onRemove} type="button" variant="ghost">
        <Trash2 aria-hidden="true" className="h-4 w-4" />
        Usun
      </Button>
    </div>
  )
}

function SmallNumberField({
  disabled,
  label,
  max,
  min = 0,
  onChange,
  value,
}: {
  disabled: boolean
  label: string
  max?: number
  min?: number
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <Input
        density="compact"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    </label>
  )
}

function Field({
  children,
  error,
  label,
  name,
}: {
  children: React.ReactNode
  error?: string
  label: string
  name: string
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      {children}
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  )
}

function validateRoutineForm(
  values: RoutineFormValues,
  exercisesById: Map<string, ExerciseWithMuscles>,
) {
  const errors: FormikErrors<RoutineFormValues> = {}
  const result = routineFormSchema.safeParse(values)

  if (!result.success) {
    for (const issue of result.error.issues) {
      if (issue.path[0] === 'name') {
        errors.name = issue.message
      } else {
        errors.blocks = issue.message
      }
    }
  }

  if (values.blocks.some((block) => !exercisesById.has(block.exerciseId))) {
    errors.blocks =
      'Jedno z cwiczen jest niedostepne. Wybierz inne albo usun blok.'
  }

  for (const block of values.blocks) {
    const exercise = exercisesById.get(block.exerciseId)
    if (!exercise) {
      continue
    }

    for (const target of block.setTargets) {
      const targetError = validateTargetForType(exercise.type, target)
      if (targetError) {
        errors.blocks = targetError
        return errors
      }
    }
  }

  return errors
}

function validateTargetForType(
  exerciseType: ExerciseType,
  target: RoutineSetTargetFormValues,
) {
  const fields = getSetTargetFields(exerciseType)
  const hasReps = Boolean(target.reps?.trim() || target.repsMin?.trim())

  if (fields.includes('weightKg') && !target.weightKg?.trim()) {
    return exerciseType === 'assisted_bodyweight'
      ? 'Podaj asyste w kg dla cwiczenia z asysta.'
      : 'Podaj ciezar dla serii wymagajacej kg.'
  }

  if (fields.includes('repsRange') && !hasReps) {
    return 'Podaj powtorzenia albo zakres powtorzen.'
  }

  if (fields.includes('durationSeconds') && !target.durationSeconds?.trim()) {
    return 'Podaj czas trwania serii.'
  }

  if (fields.includes('distanceMeters') && !target.distanceMeters?.trim()) {
    return 'Podaj dystans dla serii.'
  }

  const rpe = parseOptionalNumber(target.targetRpe)
  if (rpe !== undefined && (rpe < 1 || rpe > 10)) {
    return 'RPE musi byc liczba od 1 do 10.'
  }

  return null
}

function buildRoutinePayload(values: RoutineFormValues) {
  const parsed = routineFormSchema.parse(values)

  return {
    blocks: parsed.blocks.map((block) => ({
      exerciseId: block.exerciseId as Id<'exercises'>,
      restSeconds: parseOptionalNumber(block.restSeconds),
      setTargets: block.setTargets.map((target, index) => ({
        distanceMeters: parseOptionalNumber(target.distanceMeters),
        durationSeconds: parseOptionalNumber(target.durationSeconds),
        reps: parseOptionalNumber(target.reps),
        repsMax: parseOptionalNumber(target.repsMax),
        repsMin: parseOptionalNumber(target.repsMin),
        setIndex: index + 1,
        targetRpe: parseOptionalNumber(target.targetRpe),
        weightKg: parseOptionalNumber(target.weightKg),
      })),
      supersetGroup: block.supersetGroup?.trim() || undefined,
    })),
    name: parsed.name,
  }
}

function detailsToFormValues(details: RoutineDetails): RoutineFormValues {
  return {
    blocks: details.blocks.map((block) => ({
      exerciseId: block.exerciseId,
      restSeconds: block.restSeconds?.toString() ?? '',
      setTargets: block.setTargets.map((target) => ({
        distanceMeters: target.distanceMeters?.toString() ?? '',
        durationSeconds: target.durationSeconds?.toString() ?? '',
        reps: target.reps?.toString() ?? '',
        repsMax: target.repsMax?.toString() ?? '',
        repsMin: target.repsMin?.toString() ?? '',
        targetRpe: target.targetRpe?.toString() ?? '',
        weightKg: target.weightKg?.toString() ?? '',
      })),
      supersetGroup: block.supersetGroup ?? '',
    })),
    name: details.name,
  }
}

function RoutineEmptyState({
  canCreate,
  onCreate,
}: {
  canCreate: boolean
  onCreate: () => void
}) {
  return (
    <div className="grid min-h-80 place-items-center px-5 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <ListChecks aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-foreground">
          Biblioteka rutyn jest pusta
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Zbuduj pierwsza rutyne z cwiczen, zeby pozniej podpinac ja do
          programow i wynikow treningu.
        </p>
        <div className="mt-5">
          <Button disabled={!canCreate} onClick={onCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Dodaj rutyne
          </Button>
        </div>
      </div>
    </div>
  )
}

function RoutineIdleState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid min-h-[28rem] place-items-center text-center">
          <div className="max-w-md">
            <ListChecks
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-primary"
            />
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Wybierz rutyne albo zacznij nowa
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Edytor pokazuje kolejnosc cwiczen, serie, przerwy i opcjonalne
              superserie w jednym miejscu.
            </p>
            <div className="mt-5">
              <Button onClick={onCreate}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nowa rutyna
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function NoExercisesState() {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid min-h-[28rem] place-items-center text-center">
          <div className="max-w-md">
            <Dumbbell
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-primary"
            />
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Najpierw dodaj cwiczenia
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Builder rutyn korzysta z biblioteki cwiczen. Bez niej nie da sie
              dobrac typu serii ani wymaganych pol.
            </p>
            <Link
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              to="/exercises"
            >
              <LinkIcon aria-hidden="true" className="h-4 w-4" />
              Przejdz do cwiczen
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function CoachAuthRequiredState() {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="flex max-w-2xl items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <AlertCircle aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Zaloguj konto trenera
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Rutyny sa biblioteka coacha, wiec Convex musi dostac token
              zalogowanego uzytkownika z rola coach albo admin. Po podpieciu
              Convex Auth ta strona automatycznie pobierze rutyny.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function RoutineListSkeleton() {
  return (
    <div className="grid gap-0">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="grid gap-3 border-b border-border p-4 last:border-b-0" key={index}>
          <span className="h-5 w-3/4 rounded-md bg-muted" />
          <span className="h-4 w-1/2 rounded-md bg-muted" />
          <div className="grid grid-cols-3 gap-2">
            <span className="h-8 rounded-md bg-muted" />
            <span className="h-8 rounded-md bg-muted" />
            <span className="h-8 rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function RoutineEditorSkeleton() {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid gap-4">
          <span className="h-7 w-52 rounded-md bg-muted" />
          <span className="h-10 rounded-md bg-muted" />
          {Array.from({ length: 3 }, (_, index) => (
            <span className="h-32 rounded-md bg-muted" key={index} />
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function RoutineNoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <Search
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted-foreground"
        />
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Brak rutyn dla tej frazy
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Zmien wyszukiwanie albo wyczysc filtr, zeby zobaczyc cala biblioteke.
        </p>
        <div className="mt-5">
          <Button onClick={onReset} variant="secondary">
            Wyczysc filtr
          </Button>
        </div>
      </div>
    </div>
  )
}

function RoutineQueryError({ error }: { error: Error }) {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="flex max-w-2xl items-start gap-3">
          <AlertCircle
            aria-hidden="true"
            className="mt-1 h-5 w-5 shrink-0 text-destructive"
          />
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Nie mozemy pobrac rutyn
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sprawdz polaczenie z Convex i odswiez strone. Szczegoly:{' '}
              {error.message}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function RoutineBuilderSetupState() {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">Panel trenera</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          Rutyny
        </h1>
      </header>

      <Card>
        <CardBody padding="lg">
          <div className="flex max-w-2xl items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <AlertCircle aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Convex nie jest jeszcze podlaczony
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Ustaw `VITE_CONVEX_URL`, zeby wlaczyc liste rutyn i edytor.
                Ten ekran pozostaje stabilny bez providera Convex.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function StatusMessage({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'error' | 'success'
}) {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2

  return (
    <p
      className={
        tone === 'error'
          ? 'flex items-start gap-2 text-xs font-medium leading-5 text-destructive'
          : 'flex items-start gap-2 text-xs font-medium leading-5 text-accent-foreground'
      }
    >
      <Icon aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
