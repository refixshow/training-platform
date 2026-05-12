import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import {
  AlertCircle,
  Filter,
  Layers3,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import type { MuscleGroupDoc } from '#/entities/muscle-group'
import { CreateMuscleGroupForm } from '#/features/create-muscle-group'
import { EditMuscleGroupForm } from '#/features/edit-muscle-group'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardHeader } from '#/shared/ui/card'
import { Input } from '#/shared/ui/input'

export function MuscleGroupAdmin() {
  if (!import.meta.env.VITE_CONVEX_URL) {
    return <MuscleGroupSetupState />
  }

  return <ConnectedMuscleGroupAdmin />
}

function ConnectedMuscleGroupAdmin() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<Id<'muscleGroups'> | null>(null)
  const muscleGroupsQuery = useQuery(
    convexQuery(api.muscleGroups.list, { limit: 200 }),
  )

  const muscleGroups = (muscleGroupsQuery.data ?? []) as MuscleGroupDoc[]
  const queryError = muscleGroupsQuery.error
  const normalizedSearch = search.trim().toLowerCase()

  const filteredMuscleGroups = useMemo(() => {
    if (!normalizedSearch) {
      return muscleGroups
    }

    return muscleGroups.filter((group) =>
      group.name.toLowerCase().includes(normalizedSearch),
    )
  }, [muscleGroups, normalizedSearch])

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Panel trenera</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
            Grupy miesniowe
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Utrzymuj globalna taksonomie do klasyfikacji cwiczen. Krotkie,
            spojne nazwy przyspieszaja budowanie biblioteki, rutyn i programow.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen((value) => !value)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {isCreateOpen ? 'Zamknij formularz' : 'Dodaj grupe'}
        </Button>
      </header>

      {isCreateOpen ? (
        <CreateMuscleGroupForm onCreated={() => setIsCreateOpen(false)} />
      ) : null}

      <Card>
        <MuscleGroupToolbar
          onReset={() => setSearch('')}
          onSearch={setSearch}
          search={search}
          showReset={Boolean(search.trim())}
        />

        {muscleGroupsQuery.isPending ? (
          <MuscleGroupSkeleton />
        ) : queryError ? (
          <MuscleGroupQueryError error={queryError} />
        ) : muscleGroups.length === 0 ? (
          <MuscleGroupEmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : filteredMuscleGroups.length === 0 ? (
          <MuscleGroupNoResults onReset={() => setSearch('')} />
        ) : (
          <MuscleGroupList
            editingId={editingId}
            muscleGroups={filteredMuscleGroups}
            onCancelEdit={() => setEditingId(null)}
            onEdit={setEditingId}
            onSaved={() => setEditingId(null)}
          />
        )}
      </Card>
    </section>
  )
}

function MuscleGroupToolbar({
  onReset,
  onSearch,
  search,
  showReset,
}: {
  onReset: () => void
  onSearch: (value: string) => void
  search: string
  showReset: boolean
}) {
  return (
    <CardHeader>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-primary" />
        Filtry taksonomii
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative">
          <span className="sr-only">Szukaj grupy miesniowej</span>
          <Input
            leadingIcon={<Search aria-hidden="true" className="h-4 w-4" />}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Szukaj po nazwie"
            value={search}
          />
        </label>

        {showReset ? (
          <Button onClick={onReset} variant="secondary">
            Reset
          </Button>
        ) : null}
      </div>
    </CardHeader>
  )
}

function MuscleGroupList({
  editingId,
  muscleGroups,
  onCancelEdit,
  onEdit,
  onSaved,
}: {
  editingId: Id<'muscleGroups'> | null
  muscleGroups: MuscleGroupDoc[]
  onCancelEdit: () => void
  onEdit: (id: Id<'muscleGroups'>) => void
  onSaved: () => void
}) {
  return (
    <div>
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/65 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-3">Nazwa</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Utworzono</th>
              <th className="px-5 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {muscleGroups.map((group) => (
              <MuscleGroupTableRow
                group={group}
                isEditing={editingId === group._id}
                key={group._id}
                onCancelEdit={onCancelEdit}
                onEdit={() => onEdit(group._id)}
                onSaved={onSaved}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-0 md:hidden">
        {muscleGroups.map((group) => (
          <MuscleGroupMobileRow
            group={group}
            isEditing={editingId === group._id}
            key={group._id}
            onCancelEdit={onCancelEdit}
            onEdit={() => onEdit(group._id)}
            onSaved={onSaved}
          />
        ))}
      </div>
    </div>
  )
}

function MuscleGroupTableRow({
  group,
  isEditing,
  onCancelEdit,
  onEdit,
  onSaved,
}: {
  group: MuscleGroupDoc
  isEditing: boolean
  onCancelEdit: () => void
  onEdit: () => void
  onSaved: () => void
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-5 py-4 align-top">
        {isEditing ? (
          <EditMuscleGroupForm
            initialName={group.name}
            muscleGroupId={group._id}
            onCancel={onCancelEdit}
            onSaved={onSaved}
          />
        ) : (
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Layers3 aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <div className="font-semibold text-foreground">{group.name}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Dostepna w klasyfikacji cwiczen
              </p>
            </div>
          </div>
        )}
      </td>
      <td className="px-5 py-4 align-top text-muted-foreground">
        Aktywna
      </td>
      <td className="px-5 py-4 align-top text-muted-foreground">
        {formatDate(group.createdAt ?? group._creationTime)}
      </td>
      <td className="px-5 py-4 align-top text-right">
        {!isEditing ? (
          <Button onClick={onEdit} size="sm" variant="ghost">
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Edytuj
          </Button>
        ) : null}
      </td>
    </tr>
  )
}

function MuscleGroupMobileRow({
  group,
  isEditing,
  onCancelEdit,
  onEdit,
  onSaved,
}: {
  group: MuscleGroupDoc
  isEditing: boolean
  onCancelEdit: () => void
  onEdit: () => void
  onSaved: () => void
}) {
  return (
    <article className="grid gap-3 border-b border-border p-4 last:border-b-0">
      {isEditing ? (
        <EditMuscleGroupForm
          initialName={group.name}
          muscleGroupId={group._id}
          onCancel={onCancelEdit}
          onSaved={onSaved}
        />
      ) : (
        <>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Layers3 aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">
                {group.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aktywna grupa do cwiczen
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">
                Utworzono
              </dt>
              <dd className="mt-1 text-foreground">
                {formatDate(group.createdAt ?? group._creationTime)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">
                Status
              </dt>
              <dd className="mt-1 text-foreground">Aktywna</dd>
            </div>
          </dl>

          <div>
            <Button onClick={onEdit} size="sm" variant="ghost">
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edytuj
            </Button>
          </div>
        </>
      )}
    </article>
  )
}

function MuscleGroupSkeleton() {
  return (
    <div className="grid gap-0">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          className="grid gap-3 border-b border-border p-5 last:border-b-0 md:grid-cols-[2fr_1fr_1fr_0.6fr]"
          key={index}
        >
          {Array.from({ length: 4 }, (_, childIndex) => (
            <span
              className="h-5 rounded-md bg-muted"
              key={childIndex}
              style={{ width: `${76 - childIndex * 10}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function MuscleGroupEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center px-5 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Layers3 aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-foreground">
          Brakuje grup miesniowych
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Dodaj pierwsza grupe, zeby cwiczenia mialy glowna klasyfikacje i mogly
          pozniej filtrowac biblioteke.
        </p>
        <div className="mt-5">
          <Button onClick={onCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Dodaj grupe
          </Button>
        </div>
      </div>
    </div>
  )
}

function MuscleGroupNoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <Filter
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted-foreground"
        />
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Brak grup dla tego wyszukiwania
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Zmien szukana fraze albo wyczysc filtr, zeby zobaczyc cala
          taksonomie.
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

function MuscleGroupQueryError({ error }: { error: Error }) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-destructive"
        />
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Nie mozemy pobrac grup miesniowych
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sprawdz polaczenie z Convex i odswiez strone. Szczegoly: {error.message}
        </p>
      </div>
    </div>
  )
}

function MuscleGroupSetupState() {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">Panel trenera</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          Grupy miesniowe
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
                Ustaw `VITE_CONVEX_URL`, zeby wlaczyc liste grup i formularz
                tworzenia. Ten ekran pozostaje stabilny bez providera Convex.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}
