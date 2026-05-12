import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import {
  AlertCircle,
  Dumbbell,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import {
  exerciseEquipmentOptions,
  exerciseTypeOptions,
  getExerciseEquipmentLabel,
  getExerciseTypeIcon,
  getExerciseTypeLabel,
  type ExerciseEquipment,
  type ExerciseType,
} from '#/entities/exercise'
import { CreateExerciseForm } from '#/features/create-exercise'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardHeader } from '#/shared/ui/card'
import { Input, Select } from '#/shared/ui/input'

type ExerciseWithMuscles = Doc<'exercises'> & {
  primaryMuscleGroup: Doc<'muscleGroups'> | null
  secondaryMuscleGroups: Doc<'muscleGroups'>[]
}

type MuscleGroupDoc = Doc<'muscleGroups'>

interface ExerciseFilters {
  equipment: 'all' | ExerciseEquipment
  muscleGroupId: 'all' | Id<'muscleGroups'>
  search: string
  type: 'all' | ExerciseType
}

const defaultFilters: ExerciseFilters = {
  equipment: 'all',
  muscleGroupId: 'all',
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
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filters, setFilters] = useState<ExerciseFilters>(defaultFilters)
  const exercisesQuery = useQuery(convexQuery(api.exercises.list, { limit: 100 }))
  const muscleGroupsQuery = useQuery(
    convexQuery(api.muscleGroups.list, { limit: 100 }),
  )

  const isLoading = exercisesQuery.isPending || muscleGroupsQuery.isPending
  const queryError = exercisesQuery.error ?? muscleGroupsQuery.error
  const exerciseItems = (exercisesQuery.data ?? []) as ExerciseWithMuscles[]
  const muscleGroupItems = (muscleGroupsQuery.data ?? []) as MuscleGroupDoc[]

  const filteredExercises = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return exerciseItems.filter((exercise) => {
      const matchesSearch =
        !search ||
        exercise.name.toLowerCase().includes(search) ||
        exercise.primaryMuscleGroup?.name.toLowerCase().includes(search)

      const matchesType =
        filters.type === 'all' || exercise.type === filters.type
      const matchesEquipment =
        filters.equipment === 'all' || exercise.equipment === filters.equipment
      const matchesMuscleGroup =
        filters.muscleGroupId === 'all' ||
        exercise.primaryMuscleGroupId === filters.muscleGroupId ||
        exercise.secondaryMuscleGroupIds.includes(filters.muscleGroupId)

      return (
        matchesSearch && matchesType && matchesEquipment && matchesMuscleGroup
      )
    })
  }, [exerciseItems, filters])

  const hasActiveFilters =
    filters.search ||
    filters.type !== 'all' ||
    filters.equipment !== 'all' ||
    filters.muscleGroupId !== 'all'

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

        <Button onClick={() => setIsCreateOpen((value) => !value)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {isCreateOpen ? 'Zamknij formularz' : 'Dodaj cwiczenie'}
        </Button>
      </header>

      {isCreateOpen ? (
        <CreateExerciseForm
          muscleGroups={muscleGroupItems.map((group) => ({
            id: group._id,
            name: group.name,
          }))}
        />
      ) : null}

      <Card>
        <ExerciseToolbar
          filters={filters}
          muscleGroups={muscleGroupItems}
          onChange={setFilters}
          onReset={() => setFilters(defaultFilters)}
          showReset={Boolean(hasActiveFilters)}
        />

        {isLoading ? (
          <ExerciseSkeleton />
        ) : queryError ? (
          <ExerciseQueryError error={queryError} />
        ) : exerciseItems.length === 0 ? (
          <ExerciseEmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : filteredExercises.length === 0 ? (
          <ExerciseNoResults onReset={() => setFilters(defaultFilters)} />
        ) : (
          <ExerciseList exercises={filteredExercises} />
        )}
      </Card>
    </section>
  )
}

function ExerciseToolbar({
  filters,
  muscleGroups,
  onChange,
  onReset,
  showReset,
}: {
  filters: ExerciseFilters
  muscleGroups: MuscleGroupDoc[]
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
              muscleGroupId: value as ExerciseFilters['muscleGroupId'],
            })
          }
          value={filters.muscleGroupId}
        >
          <option value="all">Wszystkie grupy</option>
          {muscleGroups.map((group) => (
            <option key={group._id} value={group._id}>
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

function ExerciseList({ exercises }: { exercises: ExerciseWithMuscles[] }) {
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
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise) => (
              <ExerciseTableRow exercise={exercise} key={exercise._id} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-0 md:hidden">
        {exercises.map((exercise) => (
          <ExerciseMobileRow exercise={exercise} key={exercise._id} />
        ))}
      </div>
    </div>
  )
}

function ExerciseTableRow({ exercise }: { exercise: ExerciseWithMuscles }) {
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
    </tr>
  )
}

function ExerciseMobileRow({ exercise }: { exercise: ExerciseWithMuscles }) {
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
    </article>
  )
}

function MuscleGroupSummary({ exercise }: { exercise: ExerciseWithMuscles }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
        {exercise.primaryMuscleGroup?.name ?? 'Brak grupy'}
      </span>
      {exercise.secondaryMuscleGroups.map((group) => (
        <span
          className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground"
          key={group._id}
        >
          {group.name}
        </span>
      ))}
    </div>
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

function ExerciseLibrarySetupState() {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">Panel trenera</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          Cwiczenia
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
              Ustaw `VITE_CONVEX_URL`, zeby wlaczyc liste cwiczen i formularz
              tworzenia. Ten ekran pozostaje stabilny bez providera Convex.
            </p>
          </div>
        </div>
        </CardBody>
      </Card>
    </section>
  )
}
