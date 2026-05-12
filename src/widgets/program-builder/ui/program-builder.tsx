import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import {
  AlertCircle,
  ClipboardList,
  Link as LinkIcon,
  Plus,
  Search,
} from 'lucide-react'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import { formatProgramDate } from '#/entities/program'
import {
  CreateProgramForm,
  type ProgramRoutineOption,
} from '#/features/create-program'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardHeader } from '#/shared/ui/card'
import { Input } from '#/shared/ui/input'

type ProgramListItem = Doc<'programs'> & {
  routineCount: number
}

type ProgramMode =
  | { kind: 'idle' }
  | { kind: 'create' }
  | { id: Id<'programs'>; kind: 'created' }

export function ProgramBuilder() {
  if (!import.meta.env.VITE_CONVEX_URL) {
    return <ProgramBuilderSetupState />
  }

  return <ConnectedProgramBuilder />
}

function ConnectedProgramBuilder() {
  const [mode, setMode] = useState<ProgramMode>({ kind: 'idle' })
  const [search, setSearch] = useState('')
  const authQuery = useQuery(convexQuery(api.auth.currentCoachAdmin, {}))
  const canManagePrograms = Boolean(authQuery.data)
  const programsQuery = useQuery(
    convexQuery(
      api.programs.list,
      canManagePrograms ? { limit: 100 } : 'skip',
    ),
  )
  const routinesQuery = useQuery(
    convexQuery(
      api.programs.listCreateOptions,
      canManagePrograms ? { limit: 100 } : 'skip',
    ),
  )

  const programs = (programsQuery.data ?? []) as ProgramListItem[]
  const routines = (routinesQuery.data ?? []) as ProgramRoutineOption[]
  const queryError = authQuery.error ?? programsQuery.error ?? routinesQuery.error
  const normalizedSearch = search.trim().toLowerCase()

  const filteredPrograms = useMemo(() => {
    if (!normalizedSearch) {
      return programs
    }

    return programs.filter((program) =>
      program.title.toLowerCase().includes(normalizedSearch),
    )
  }, [normalizedSearch, programs])

  const createdProgram =
    mode.kind === 'created'
      ? programs.find((program) => program._id === mode.id) ?? null
      : null

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Panel trenera</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
            Programy
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Tworz zbiory rutyn, ktore pozniej przypiszesz klientom. Klient sam
            wybierze rutyne do wykonania z przypisanego programu.
          </p>
        </div>

        <Button
          disabled={!canManagePrograms || routines.length === 0}
          onClick={() => setMode({ kind: 'create' })}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Dodaj program
        </Button>
      </header>

      {authQuery.isPending ? (
        <ProgramWorkspaceSkeleton />
      ) : queryError ? (
        <ProgramQueryError error={queryError} />
      ) : !canManagePrograms ? (
        <CoachAuthRequiredState />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ClipboardList aria-hidden="true" className="h-4 w-4 text-primary" />
                Biblioteka programow
              </div>
              <label className="relative">
                <span className="sr-only">Szukaj programu</span>
                <Input
                  leadingIcon={<Search aria-hidden="true" className="h-4 w-4" />}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Szukaj po nazwie"
                  value={search}
                />
              </label>
            </CardHeader>

            {programsQuery.isPending ? (
              <ProgramListSkeleton />
            ) : programs.length === 0 ? (
              <ProgramEmptyState
                canCreate={routines.length > 0}
                onCreate={() => setMode({ kind: 'create' })}
              />
            ) : filteredPrograms.length === 0 ? (
              <ProgramNoResults onReset={() => setSearch('')} />
            ) : (
              <ProgramList
                programs={filteredPrograms}
                selectedId={createdProgram?._id ?? null}
              />
            )}
          </Card>

          <div className="min-w-0">
            {routinesQuery.isPending ? (
              <ProgramWorkspaceSkeleton />
            ) : routines.length === 0 ? (
              <NoRoutinesState />
            ) : mode.kind === 'create' ? (
              <CreateProgramForm
                onCancel={() => setMode({ kind: 'idle' })}
                onCreated={(programId) => setMode({ id: programId, kind: 'created' })}
                routines={routines}
              />
            ) : mode.kind === 'created' && createdProgram ? (
              <ProgramCreatedState
                onCreate={() => setMode({ kind: 'create' })}
                program={createdProgram}
              />
            ) : (
              <ProgramIdleState onCreate={() => setMode({ kind: 'create' })} />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function ProgramList({
  programs,
  selectedId,
}: {
  programs: ProgramListItem[]
  selectedId: Id<'programs'> | null
}) {
  return (
    <div className="grid gap-0">
      {programs.map((program) => (
        <article
          className={
            selectedId === program._id
              ? 'grid gap-3 border-b border-border bg-accent/60 p-4 last:border-b-0'
              : 'grid gap-3 border-b border-border p-4 last:border-b-0'
          }
          key={program._id}
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-foreground">
              {program.title}
            </h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {formatProgramDate(program.updatedAt ?? program.createdAt)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Tygodnie" value={program.durationWeeks} />
            <Metric label="Rutyny" value={program.routineCount} />
          </dl>
        </article>
      ))}
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

function ProgramEmptyState({
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
          <ClipboardList aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-foreground">
          Biblioteka programow jest pusta
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Stworz pierwszy program jako zestaw rutyn, ktory pozniej przypiszesz
          klientowi.
        </p>
        <div className="mt-5">
          <Button disabled={!canCreate} onClick={onCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Dodaj program
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProgramIdleState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid min-h-[28rem] place-items-center text-center">
          <div className="max-w-md">
            <ClipboardList
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-primary"
            />
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Zacznij od nowego programu
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Program jest uporzadkowana lista rutyn. Nie przypisuje dni,
              dzieki czemu klient wybiera trening z dostepnego zestawu.
            </p>
            <div className="mt-5">
              <Button onClick={onCreate}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nowy program
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function ProgramCreatedState({
  onCreate,
  program,
}: {
  onCreate: () => void
  program: ProgramListItem
}) {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid min-h-[28rem] place-items-center text-center">
          <div className="max-w-lg">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <ClipboardList aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-5 text-xl font-bold text-foreground">
              Program zapisany
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              `{program.title}` ma {program.routineCount} rutyn i jest gotowy do
              przyszlego przypisania klientowi.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={onCreate} variant="secondary">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Dodaj kolejny
              </Button>
              <Button disabled variant="ghost">
                <LinkIcon aria-hidden="true" className="h-4 w-4" />
                Przypisz pozniej
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function NoRoutinesState() {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid min-h-[28rem] place-items-center text-center">
          <div className="max-w-md">
            <ClipboardList
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-primary"
            />
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Najpierw dodaj rutyny
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Program wymaga przynajmniej jednej rutyny. Zbuduj rutyny z
              cwiczen, a potem wroc tutaj i utworz program dla klienta.
            </p>
            <a
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/routines"
            >
              <LinkIcon aria-hidden="true" className="h-4 w-4" />
              Przejdz do rutyn
            </a>
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
              Programy sa biblioteka coacha. Convex musi dostac sesje z rola
              coach albo admin, zanim pozwoli tworzyc programy.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function ProgramNoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <Search
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted-foreground"
        />
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Brak programow dla tej frazy
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

function ProgramQueryError({ error }: { error: Error }) {
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
              Nie mozemy pobrac programow
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

function ProgramListSkeleton() {
  return (
    <div className="grid gap-0">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          className="grid gap-3 border-b border-border p-4 last:border-b-0"
          key={index}
        >
          <span className="h-5 w-3/4 rounded-md bg-muted" />
          <span className="h-4 w-1/2 rounded-md bg-muted" />
          <div className="grid grid-cols-2 gap-2">
            <span className="h-8 rounded-md bg-muted" />
            <span className="h-8 rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProgramWorkspaceSkeleton() {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid gap-4">
          <span className="h-7 w-52 rounded-md bg-muted" />
          <span className="h-10 rounded-md bg-muted" />
          {Array.from({ length: 3 }, (_, index) => (
            <span className="h-28 rounded-md bg-muted" key={index} />
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function ProgramBuilderSetupState() {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">Panel trenera</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          Programy
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
                Ustaw `VITE_CONVEX_URL`, zeby wlaczyc liste programow i
                tworzenie programu. Ten ekran pozostaje stabilny bez providera.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}
