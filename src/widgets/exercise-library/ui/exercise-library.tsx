import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import {
  AlertCircle,
  Dumbbell,
  Filter,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import {
  emptyExerciseFormValues,
  exerciseEquipmentOptions,
  exerciseTypeOptions,
  getExerciseEquipmentLabel,
  getExerciseTypeIcon,
  getExerciseTypeLabel,
  type ExerciseEquipment,
  type ExerciseFormValues,
  type ExerciseType,
} from '#/entities/exercise'
import {
  getMuscleGroupLabel,
  muscleGroupOptions,
  type MuscleGroup,
} from '#/entities/muscle-group'
import { CreateExerciseForm } from '#/features/create-exercise'
import { Button } from '#/shared/ui/button'
import { Card, CardHeader } from '#/shared/ui/card'
import { Input, Select } from '#/shared/ui/input'
import { Notice } from '#/shared/ui/notice'
import { StateCard } from '#/shared/ui/state-card'

type Exercise = Doc<'exercises'>

type EditorMode =
  | { kind: 'create' }
  | { exercise: Exercise; kind: 'edit' }
  | { kind: 'idle' }

interface ExerciseFilters {
  equipment: 'all' | ExerciseEquipment
  muscleGroup: 'all' | MuscleGroup
  search: string
  type: 'all' | ExerciseType
}

const defaultFilters: ExerciseFilters = {
  equipment: 'all',
  muscleGroup: 'all',
  search: '',
  type: 'all',
}

export function ExerciseLibrary() {
  if (!import.meta.env.VITE_CONVEX_URL) {
    return <ExerciseLibrarySetupState />
  }

  return <ConnectedExerciseLibrary />
}

function ConnectedExerciseLibrary() {
  const [mode, setMode] = useState<EditorMode>({ kind: 'idle' })
  const [filters, setFilters] = useState<ExerciseFilters>(defaultFilters)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const authQuery = useQuery(convexQuery(api.auth.currentCoachAdmin, {}))
  const canManageExercises = Boolean(authQuery.data)
  const removeExercise = useMutation(api.exercises.remove)
  const exerciseListArgs = useMemo(
    () =>
      canManageExercises
        ? {
            equipment:
              filters.equipment === 'all' ? undefined : filters.equipment,
            limit: 100,
            muscleGroup:
              filters.muscleGroup === 'all' ? undefined : filters.muscleGroup,
            search: filters.search.trim() || undefined,
            type: filters.type === 'all' ? undefined : filters.type,
          }
        : 'skip',
    [canManageExercises, filters],
  )
  const exercisesQuery = useQuery(
    convexQuery(api.exercises.list, exerciseListArgs),
  )

  const isLoading = authQuery.isPending || exercisesQuery.isPending
  const queryError = authQuery.error ?? exercisesQuery.error
  const exerciseItems = (exercisesQuery.data ?? []) as Exercise[]

  const hasActiveFilters =
    filters.search ||
    filters.type !== 'all' ||
    filters.equipment !== 'all' ||
    filters.muscleGroup !== 'all'

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Panel trenera</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
            Cwiczenia
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Globalna biblioteka cwiczen do rutyn. Utrzymuj nazwy, typ wyniku,
            sprzet i grupy miesniowe w jednym miejscu, zeby pozniejsze
            programowanie bylo szybkie.
          </p>
        </div>

        <Button
          disabled={!canManageExercises}
          onClick={() => {
            setMode((current) =>
              current.kind === 'create' ? { kind: 'idle' } : { kind: 'create' },
            )
            setNotice(null)
            setDeleteError(null)
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {mode.kind === 'create' ? 'Zamknij formularz' : 'Dodaj cwiczenie'}
        </Button>
      </header>

      {isLoading ? (
        <ExerciseSkeletonCard />
      ) : queryError ? (
        <ExerciseQueryError error={queryError} />
      ) : !canManageExercises ? (
        <CoachAuthRequiredState />
      ) : (
        <>
          {notice || deleteError ? (
            <Notice tone={deleteError ? 'error' : 'success'}>
              {deleteError ?? notice}
            </Notice>
          ) : null}

          {mode.kind !== 'idle' ? (
            <CreateExerciseForm
              exerciseId={mode.kind === 'edit' ? mode.exercise._id : undefined}
              initialValues={
                mode.kind === 'edit'
                  ? toExerciseFormValues(mode.exercise)
                  : emptyExerciseFormValues
              }
              mode={mode.kind}
              onCancel={() => setMode({ kind: 'idle' })}
              onSaved={() => {
                setNotice(
                  mode.kind === 'edit'
                    ? 'Cwiczenie zostalo zaktualizowane.'
                    : 'Cwiczenie zostalo dodane do biblioteki.',
                )
                setDeleteError(null)
                setMode({ kind: 'idle' })
              }}
            />
          ) : null}

          <Card>
            <ExerciseToolbar
              filters={filters}
              onChange={(nextFilters) => {
                setFilters(nextFilters)
                setNotice(null)
                setDeleteError(null)
              }}
              onReset={() => setFilters(defaultFilters)}
              showReset={Boolean(hasActiveFilters)}
            />

            {exerciseItems.length === 0 && !hasActiveFilters ? (
              <ExerciseEmptyState onCreate={() => setMode({ kind: 'create' })} />
            ) : exerciseItems.length === 0 ? (
              <ExerciseNoResults onReset={() => setFilters(defaultFilters)} />
            ) : (
              <ExerciseList
                exercises={exerciseItems}
                onDelete={(exercise) =>
                  void handleDeleteExercise(exercise, removeExercise, {
                    onError: setDeleteError,
                    onSuccess: () => {
                      setDeleteError(null)
                      setNotice('Cwiczenie zostalo usuniete.')
                      setMode({ kind: 'idle' })
                    },
                  })
                }
                onEdit={(exercise) => {
                  setMode({ exercise, kind: 'edit' })
                  setNotice(null)
                  setDeleteError(null)
                }}
              />
            )}
          </Card>
        </>
      )}
    </section>
  )
}

function ExerciseToolbar({
  filters,
  onChange,
  onReset,
  showReset,
}: {
  filters: ExerciseFilters
  onChange: (filters: ExerciseFilters) => void
  onReset: () => void
  showReset: boolean
}) {
  return (
    <CardHeader>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-primary" />
        Filtry biblioteki
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1.4fr)_repeat(3,minmax(10rem,1fr))_auto]">
        <label className="relative">
          <span className="sr-only">Szukaj po nazwie</span>
          <Input
            leadingIcon={<Search aria-hidden="true" className="h-4 w-4" />}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
            placeholder="Szukaj cwiczenia"
            value={filters.search}
          />
        </label>

        <FilterSelect
          label="Typ"
          onChange={(value) =>
            onChange({ ...filters, type: value as ExerciseFilters['type'] })
          }
          value={filters.type}
        >
          <option value="all">Wszystkie typy</option>
          {exerciseTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Sprzet"
          onChange={(value) =>
            onChange({
              ...filters,
              equipment: value as ExerciseFilters['equipment'],
            })
          }
          value={filters.equipment}
        >
          <option value="all">Kazdy sprzet</option>
          {exerciseEquipmentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Grupa miesniowa"
          onChange={(value) =>
            onChange({
              ...filters,
              muscleGroup: value as ExerciseFilters['muscleGroup'],
            })
          }
          value={filters.muscleGroup}
        >
          <option value="all">Wszystkie grupy</option>
          {muscleGroupOptions.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </FilterSelect>

        {showReset ? (
          <Button onClick={onReset} variant="secondary">
            Reset
          </Button>
        ) : null}
      </div>
    </CardHeader>
  )
}

function FilterSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <Select
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </Select>
    </label>
  )
}

function ExerciseList({
  exercises,
  onDelete,
  onEdit,
}: {
  exercises: Exercise[]
  onDelete: (exercise: Exercise) => void
  onEdit: (exercise: Exercise) => void
}) {
  return (
    <div>
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/65 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-3">Cwiczenie</th>
              <th className="px-5 py-3">Typ wyniku</th>
              <th className="px-5 py-3">Sprzet</th>
              <th className="px-5 py-3">Grupy miesniowe</th>
              <th className="px-5 py-3">Instrukcje</th>
              <th className="px-5 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise) => (
              <ExerciseTableRow
                exercise={exercise}
                key={exercise._id}
                onDelete={() => onDelete(exercise)}
                onEdit={() => onEdit(exercise)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-0 md:hidden">
        {exercises.map((exercise) => (
          <ExerciseMobileRow
            exercise={exercise}
            key={exercise._id}
            onDelete={() => onDelete(exercise)}
            onEdit={() => onEdit(exercise)}
          />
        ))}
      </div>
    </div>
  )
}

function ExerciseTableRow({
  exercise,
  onDelete,
  onEdit,
}: {
  exercise: Exercise
  onDelete: () => void
  onEdit: () => void
}) {
  const Icon = getExerciseTypeIcon(exercise.type)

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-5 py-4 align-top">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <div className="font-semibold text-foreground">{exercise.name}</div>
            {exercise.videoUrl ? (
              <a
                className="mt-1 inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={exercise.videoUrl}
                rel="noreferrer"
                target="_blank"
              >
                Link wideo
                <span className="sr-only">
                  {' '}
                  dla {exercise.name}, otwiera nowe okno
                </span>
              </a>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Bez wideo</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-4 align-top text-muted-foreground">
        {getExerciseTypeLabel(exercise.type)}
      </td>
      <td className="px-5 py-4 align-top text-muted-foreground">
        {exercise.equipment === 'other' && exercise.customEquipment
          ? exercise.customEquipment
          : getExerciseEquipmentLabel(exercise.equipment)}
      </td>
      <td className="px-5 py-4 align-top">
        <MuscleGroupSummary exercise={exercise} />
      </td>
      <td className="px-5 py-4 align-top text-muted-foreground">
        {exercise.instructions.length > 0
          ? `${exercise.instructions.length} krokow`
          : 'Brak'}
      </td>
      <td className="px-5 py-4 align-top">
        <div className="flex justify-end gap-2">
          <Button onClick={onEdit} size="sm" variant="secondary">
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Edytuj
          </Button>
          <Button onClick={onDelete} size="sm" variant="ghost">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Usun
          </Button>
        </div>
      </td>
    </tr>
  )
}

function ExerciseMobileRow({
  exercise,
  onDelete,
  onEdit,
}: {
  exercise: Exercise
  onDelete: () => void
  onEdit: () => void
}) {
  const Icon = getExerciseTypeIcon(exercise.type)

  return (
    <article className="grid gap-3 border-b border-border p-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">
            {exercise.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {getExerciseTypeLabel(exercise.type)}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">Sprzet</dt>
          <dd className="mt-1 text-foreground">
            {exercise.equipment === 'other' && exercise.customEquipment
              ? exercise.customEquipment
              : getExerciseEquipmentLabel(exercise.equipment)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">
            Instrukcje
          </dt>
          <dd className="mt-1 text-foreground">
            {exercise.instructions.length > 0
              ? `${exercise.instructions.length} krokow`
              : 'Brak'}
          </dd>
        </div>
      </dl>
      <MuscleGroupSummary exercise={exercise} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={onEdit} size="sm" variant="secondary">
          <Pencil aria-hidden="true" className="h-4 w-4" />
          Edytuj
        </Button>
        <Button onClick={onDelete} size="sm" variant="ghost">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Usun
        </Button>
      </div>
    </article>
  )
}

function MuscleGroupSummary({ exercise }: { exercise: Exercise }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
        {getMuscleGroupLabel(exercise.primaryMuscleGroup)}
      </span>
      {exercise.secondaryMuscleGroups.map((group) => (
        <span
          className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground"
          key={group}
        >
          {getMuscleGroupLabel(group)}
        </span>
      ))}
    </div>
  )
}

function ExerciseSkeletonCard() {
  return (
    <Card>
      <ExerciseSkeleton />
    </Card>
  )
}

function ExerciseSkeleton() {
  return (
    <div className="grid gap-0">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          className="grid gap-3 border-b border-border p-5 last:border-b-0 md:grid-cols-[2fr_1fr_1fr_1.5fr_0.8fr]"
          key={index}
        >
          {Array.from({ length: 5 }, (_, childIndex) => (
            <span
              className="h-5 rounded-md bg-muted"
              key={childIndex}
              style={{ width: `${70 - childIndex * 8}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function ExerciseEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center px-5 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Dumbbell aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-foreground">
          Biblioteka cwiczen jest pusta
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Dodaj pierwsze cwiczenie z typem wyniku, sprzetem i grupa miesniowa.
          Potem wykorzystasz je podczas budowania rutyn.
        </p>
        <div className="mt-5">
          <Button onClick={onCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Dodaj cwiczenie
          </Button>
        </div>
      </div>
    </div>
  )
}

function ExerciseNoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <Filter
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted-foreground"
        />
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Brak cwiczen dla tych filtrow
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Zmien wyszukiwanie albo wyczysc filtry, zeby zobaczyc cala
          biblioteke.
        </p>
        <div className="mt-5">
          <Button onClick={onReset} variant="secondary">
            Wyczysc filtry
          </Button>
        </div>
      </div>
    </div>
  )
}

function ExerciseQueryError({ error }: { error: Error }) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-destructive"
        />
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Nie mozemy pobrac biblioteki cwiczen
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sprawdz polaczenie z Convex i odswiez strone. Szczegoly: {error.message}
        </p>
      </div>
    </div>
  )
}

function CoachAuthRequiredState() {
  return (
    <StateCard
      icon={<AlertCircle aria-hidden="true" />}
      title="Ten widok jest tylko dla coacha"
    >
      Biblioteka cwiczen jest narzedziem programowania. Zaloguj sie na konto
      coach/admin, zeby zarzadzac cwiczeniami.
    </StateCard>
  )
}

function ExerciseLibrarySetupState() {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">Panel trenera</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          Cwiczenia
        </h1>
      </header>

      <StateCard
        icon={<AlertCircle aria-hidden="true" />}
        title="Convex nie jest jeszcze podlaczony"
      >
        Ustaw `VITE_CONVEX_URL`, zeby wlaczyc liste cwiczen i formularz
        tworzenia. Ten ekran pozostaje stabilny bez providera Convex.
      </StateCard>
    </section>
  )
}

function toExerciseFormValues(exercise: Exercise): ExerciseFormValues {
  return {
    customEquipment: exercise.customEquipment ?? '',
    equipment: exercise.equipment,
    instructionText: exercise.instructions.join('\n'),
    name: exercise.name,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    secondaryMuscleGroups: exercise.secondaryMuscleGroups,
    type: exercise.type,
    videoUrl: exercise.videoUrl ?? '',
  }
}

async function handleDeleteExercise(
  exercise: Exercise,
  removeExercise: (args: { exerciseId: Id<'exercises'> }) => Promise<Id<'exercises'>>,
  callbacks: {
    onError: (message: string) => void
    onSuccess: () => void
  },
) {
  const confirmed = window.confirm(
    `Usunac cwiczenie "${exercise.name}" z biblioteki? Tej akcji nie da sie cofnac.`,
  )

  if (!confirmed) {
    return
  }

  try {
    await removeExercise({ exerciseId: exercise._id })
    callbacks.onSuccess()
  } catch (error) {
    callbacks.onError(
      error instanceof Error
        ? error.message
        : 'Nie udalo sie usunac cwiczenia.',
    )
  }
}
