import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Link as LinkIcon,
  Plus,
  Search,
  UserRound,
} from 'lucide-react'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import { formatAssignmentDate } from '#/entities/program'
import {
  AssignProgramForm,
  type AssignmentProgramOption,
  type AssignmentTraineeOption,
} from '#/features/assign-program'
import { UnassignProgramButton } from '#/features/unassign-program'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardHeader } from '#/shared/ui/card'
import { Input, Select } from '#/shared/ui/input'
import { Notice } from '#/shared/ui/notice'
import { StateCard } from '#/shared/ui/state-card'

type ProgramAssignmentRow = Doc<'programAssignments'> & {
  hasTrainingResults: boolean
  program: AssignmentProgramOption
  trainee: Pick<Doc<'users'>, '_id' | 'email' | 'name'>
}

type AssignmentMode =
  | { kind: 'idle' }
  | { kind: 'assign' }
  | { id: Id<'programAssignments'>; kind: 'assigned' }

export function ProgramAssignment() {
  if (!import.meta.env.VITE_CONVEX_URL) {
    return <ProgramAssignmentSetupState />
  }

  return <ConnectedProgramAssignment />
}

function ConnectedProgramAssignment() {
  const [mode, setMode] = useState<AssignmentMode>({ kind: 'idle' })
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const authQuery = useQuery(convexQuery(api.auth.currentCoachAdmin, {}))
  const canManageAssignments = Boolean(authQuery.data)
  const assignmentsQuery = useQuery(
    convexQuery(
      api.programAssignments.listByCoach,
      canManageAssignments ? { limit: 100 } : 'skip',
    ),
  )
  const optionsQuery = useQuery(
    convexQuery(
      api.programAssignments.listCreateOptions,
      canManageAssignments ? { limit: 100 } : 'skip',
    ),
  )

  const assignments = (assignmentsQuery.data ?? []) as ProgramAssignmentRow[]
  const options = optionsQuery.data ?? { programs: [], trainees: [] }
  const programs = options.programs as AssignmentProgramOption[]
  const trainees = options.trainees as AssignmentTraineeOption[]
  const queryError = authQuery.error ?? assignmentsQuery.error ?? optionsQuery.error
  const normalizedSearch = search.trim().toLowerCase()

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesProgram =
        !programFilter || assignment.program._id === programFilter
      const searchable = [
        assignment.program.title,
        assignment.trainee.name,
        assignment.trainee.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesSearch =
        !normalizedSearch || searchable.includes(normalizedSearch)

      return matchesProgram && matchesSearch
    })
  }, [assignments, normalizedSearch, programFilter])

  const createdAssignment =
    mode.kind === 'assigned'
      ? assignments.find((assignment) => assignment._id === mode.id) ?? null
      : null
  const isAssignmentLimitReached = assignments.length >= 100

  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Panel trenera</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
            Przypisania
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Sprawdz, ktorzy klienci maja dostep do konkretnych programow.
            Przypisania sa osobnym krokiem od budowania programu.
          </p>
        </div>

        <div className="grid sm:block [&>button]:w-full sm:[&>button]:w-auto">
          <Button
            disabled={!canManageAssignments}
            onClick={() => {
              setMode({ kind: 'assign' })
              setNotice(null)
            }}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Przypisz program
          </Button>
        </div>
      </header>

      {authQuery.isPending ? (
        <AssignmentWorkspaceSkeleton />
      ) : queryError ? (
        <AssignmentQueryError error={queryError} />
      ) : !canManageAssignments ? (
        <CoachAuthRequiredState />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div
            className={
              mode.kind === 'assign' || mode.kind === 'assigned'
                ? 'order-2 grid min-w-0 gap-5 lg:order-1'
                : 'order-1 grid min-w-0 gap-5'
            }
          >
            {notice ? (
              <Notice tone={isErrorNotice(notice) ? 'error' : 'success'}>
                {notice}
              </Notice>
            ) : null}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ClipboardCheck
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                    />
                    Lista przypisan
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem]">
                    <label className="relative">
                      <span className="sr-only">Szukaj przypisania</span>
                      <Input
                        density="default"
                        leadingIcon={<Search aria-hidden="true" className="h-4 w-4" />}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Klient albo program"
                        value={search}
                      />
                    </label>
                    <label>
                      <span className="sr-only">Filtruj po programie</span>
                      <Select
                        density="default"
                        onChange={(event) => setProgramFilter(event.target.value)}
                        value={programFilter}
                      >
                        <option value="">Wszystkie programy</option>
                        {programs.map((program) => (
                          <option key={program._id} value={program._id}>
                            {program.title}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>
                </div>
              </CardHeader>

              {assignmentsQuery.isPending || optionsQuery.isPending ? (
                <AssignmentListSkeleton />
              ) : assignments.length === 0 ? (
                <AssignmentEmptyState onAssign={() => setMode({ kind: 'assign' })} />
              ) : filteredAssignments.length === 0 ? (
                <AssignmentNoResults
                  onReset={() => {
                    setSearch('')
                    setProgramFilter('')
                  }}
                />
              ) : (
                <AssignmentList
                  assignments={filteredAssignments}
                  highlightedId={createdAssignment?._id ?? null}
                  isLimitReached={isAssignmentLimitReached}
                  onNotice={setNotice}
                />
              )}
            </Card>
          </div>

          <div
            className={
              mode.kind === 'assign' || mode.kind === 'assigned'
                ? 'order-1 min-w-0 lg:order-2'
                : 'order-2 min-w-0'
            }
          >
            {optionsQuery.isPending ? (
              <AssignmentPanelSkeleton />
            ) : mode.kind === 'assign' ? (
              <AssignProgramForm
                onAssigned={(assignmentId) => {
                  setMode({ id: assignmentId, kind: 'assigned' })
                  setNotice('Program zostal przypisany. Lista odswiezy sie automatycznie.')
                }}
                onCancel={() => setMode({ kind: 'idle' })}
                programs={programs}
                trainees={trainees}
              />
            ) : mode.kind === 'assigned' && createdAssignment ? (
              <AssignmentCreatedState
                assignment={createdAssignment}
                onAssign={() => setMode({ kind: 'assign' })}
              />
            ) : (
              <AssignmentIdleState
                hasPrograms={programs.length > 0}
                hasTrainees={trainees.length > 0}
                onAssign={() => setMode({ kind: 'assign' })}
              />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function AssignmentList({
  assignments,
  highlightedId,
  isLimitReached,
  onNotice,
}: {
  assignments: ProgramAssignmentRow[]
  highlightedId: Id<'programAssignments'> | null
  isLimitReached: boolean
  onNotice: (message: string | null) => void
}) {
  return (
    <div className="grid gap-0">
      <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_6.5rem_6.5rem_7rem] gap-3 border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground md:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_8rem_8rem_8rem] xl:gap-4">
        <span>Klient</span>
        <span>Program</span>
        <span>Przypisano</span>
        <span>Status</span>
        <span className="text-right">Akcje</span>
      </div>
      {assignments.map((assignment) => {
        const traineeName = formatTraineeName(assignment.trainee)
        const assignmentLabel = `${assignment.program.title} dla ${traineeName}`

        return (
          <article
            className={
              highlightedId === assignment._id
                ? 'grid gap-4 border-b border-border bg-accent/65 p-4 last:border-b-0 sm:p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_6.5rem_6.5rem_7rem] md:items-center md:gap-3 md:p-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_8rem_8rem_8rem] xl:gap-4'
                : 'grid gap-4 border-b border-border p-4 transition-colors hover:bg-muted/50 last:border-b-0 sm:p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_6.5rem_6.5rem_7rem] md:items-center md:gap-3 md:p-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_8rem_8rem_8rem] xl:gap-4'
            }
            key={assignment._id}
          >
            <AssignmentCell label="Klient">
              <p className="break-words text-sm font-bold text-foreground md:truncate">
                {traineeName}
              </p>
              <p className="mt-1 break-all text-xs font-medium text-muted-foreground md:truncate">
                {assignment.trainee.email ?? 'Brak emaila'}
              </p>
            </AssignmentCell>
            <AssignmentCell label="Program">
              <p className="break-words text-sm font-bold text-foreground md:truncate">
                {assignment.program.title}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {assignment.program.durationWeeks} tyg. /{' '}
                {assignment.program.routineCount} rutyn
              </p>
            </AssignmentCell>
            <AssignmentCell label="Przypisano">
              <p className="text-sm font-semibold text-foreground">
                {formatAssignmentDate(assignment.assignedAt)}
              </p>
            </AssignmentCell>
            <AssignmentCell label="Status">
              <AssignmentStatus hasTrainingResults={assignment.hasTrainingResults} />
            </AssignmentCell>
            <AssignmentCell align="end" label="Akcje">
              <UnassignProgramButton
                assignmentId={assignment._id}
                assignmentLabel={assignmentLabel}
                disabledReason={
                  assignment.hasTrainingResults
                    ? 'Nie mozna usunac przypisania z historia treningu'
                    : undefined
                }
                onError={onNotice}
                onUnassigned={() =>
                  onNotice('Przypisanie zostalo usuniete z listy klienta.')
                }
              />
            </AssignmentCell>
          </article>
        )
      })}
      {isLimitReached ? (
        <p className="border-t border-border px-4 py-3 text-xs font-medium leading-5 text-muted-foreground">
          Pokazujemy najnowsze 100 przypisan. Uzyj wyszukiwarki lub filtra, aby
          zawezic liste.
        </p>
      ) : null}
    </div>
  )
}

function AssignmentCell({
  align = 'start',
  children,
  label,
}: {
  align?: 'end' | 'start'
  children: React.ReactNode
  label: string
}) {
  return (
    <div className={align === 'end' ? 'min-w-0 md:text-right' : 'min-w-0'}>
      <span className="mb-1 block text-xs font-bold uppercase text-muted-foreground md:sr-only">
        {label}
      </span>
      {children}
    </div>
  )
}

function AssignmentStatus({
  hasTrainingResults,
}: {
  hasTrainingResults: boolean
}) {
  if (hasTrainingResults) {
    return (
      <span className="inline-flex w-fit items-center rounded-md bg-muted px-2 py-1 text-xs font-bold text-foreground">
        Historia
      </span>
    )
  }

  return (
    <span className="inline-flex w-fit items-center rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
      Aktywne
    </span>
  )
}

function AssignmentEmptyState({ onAssign }: { onAssign: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center px-5 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-foreground">
          Nie ma jeszcze przypisan
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Polacz gotowy program z klientem, zeby zobaczyl go w swoim widoku
          treningowym.
        </p>
        <div className="mt-5">
          <Button onClick={onAssign}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Przypisz program
          </Button>
        </div>
      </div>
    </div>
  )
}

function AssignmentIdleState({
  hasPrograms,
  hasTrainees,
  onAssign,
}: {
  hasPrograms: boolean
  hasTrainees: boolean
  onAssign: () => void
}) {
  const blockedCopy = !hasPrograms
    ? 'Najpierw utworz program z rutynami.'
    : !hasTrainees
      ? 'Najpierw dodaj klienta przypisanego do trenera.'
      : null

  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid min-h-[24rem] place-items-center text-center">
          <div className="max-w-md">
            <UserRound
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-primary"
            />
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Wybierz program i klienta
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Panel przypisan trzyma operacje blisko listy, wiec trener moze
              szybko sprawdzic, kto ma jaki program.
            </p>
            {blockedCopy ? (
              <p className="mt-4 text-xs font-semibold text-destructive">
                {blockedCopy}
              </p>
            ) : null}
            <div className="mt-5">
              <Button onClick={onAssign}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Przypisz program
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function AssignmentCreatedState({
  assignment,
  onAssign,
}: {
  assignment: ProgramAssignmentRow
  onAssign: () => void
}) {
  return (
    <Card>
      <CardBody padding="lg">
        <div className="grid min-h-[24rem] place-items-center text-center">
          <div className="max-w-md">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-5 text-xl font-bold text-foreground">
              Przypisanie gotowe
            </h2>
            <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">
              {assignment.program.title} jest teraz widoczny dla klienta{' '}
              {formatTraineeName(assignment.trainee)}.
            </p>
            <div className="mt-5">
              <Button onClick={onAssign} variant="secondary">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Przypisz kolejny
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function AssignmentNoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="grid min-h-64 place-items-center px-5 py-10 text-center">
      <div className="max-w-md">
        <Search
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted-foreground"
        />
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Brak przypisan dla tych filtrow
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Zmien fraze albo filtr programu, zeby wrocic do pelnej listy.
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

function AssignmentQueryError({ error }: { error: Error }) {
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
              Nie mozemy pobrac przypisan
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sprawdz polaczenie z Convex i odswiez strone.
            </p>
            <details className="mt-3 text-sm text-muted-foreground">
              <summary className="cursor-pointer font-bold text-foreground">
                Szczegoly techniczne
              </summary>
              <p className="mt-2 break-words leading-6">{error.message}</p>
            </details>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function CoachAuthRequiredState() {
  return (
    <StateCard
      icon={<AlertCircle aria-hidden="true" />}
      title="Zaloguj konto trenera"
    >
      Przypisania wymagaja sesji z rola coach albo admin. Convex sprawdza role
      przed odczytem i zapisem.
    </StateCard>
  )
}

function AssignmentListSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-0">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          className="grid gap-4 border-b border-border p-4 last:border-b-0 sm:p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_6.5rem_6.5rem_7rem] md:gap-3 md:p-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_8rem_8rem_8rem] xl:gap-4"
          key={index}
        >
          <span className="h-10 rounded-md bg-muted" />
          <span className="h-10 rounded-md bg-muted" />
          <span className="h-6 rounded-md bg-muted" />
          <span className="h-6 rounded-md bg-muted" />
          <span className="h-9 rounded-md bg-muted" />
        </div>
      ))}
    </div>
  )
}

function AssignmentWorkspaceSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <Card>
        <CardBody padding="lg">
          <div className="grid gap-4">
            <span className="h-10 rounded-md bg-muted" />
            {Array.from({ length: 4 }, (_, index) => (
              <span className="h-16 rounded-md bg-muted" key={index} />
            ))}
          </div>
        </CardBody>
      </Card>
      <AssignmentPanelSkeleton />
    </div>
  )
}

function AssignmentPanelSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardBody padding="lg">
        <div className="grid gap-4">
          <span className="h-7 w-48 rounded-md bg-muted" />
          <span className="h-11 rounded-md bg-muted" />
          <span className="h-11 rounded-md bg-muted" />
          <span className="h-24 rounded-md bg-muted" />
        </div>
      </CardBody>
    </Card>
  )
}

function ProgramAssignmentSetupState() {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">Panel trenera</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          Przypisania
        </h1>
      </header>

      <StateCard
        icon={<LinkIcon aria-hidden="true" />}
        title="Convex nie jest jeszcze podlaczony"
      >
        Ustaw `VITE_CONVEX_URL`, zeby wlaczyc liste przypisan i formularz
        przypisania programu klientowi.
      </StateCard>
    </section>
  )
}

function isErrorNotice(message: string) {
  return message.toLocaleLowerCase('pl-PL').includes('nie moz')
}

function formatTraineeName(
  trainee: Pick<Doc<'users'>, '_id' | 'email' | 'name'>,
) {
  return trainee.name || trainee.email || 'Klient bez nazwy'
}
