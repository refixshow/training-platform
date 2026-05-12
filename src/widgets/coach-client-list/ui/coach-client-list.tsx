import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import type { FunctionReturnType } from 'convex/server'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Link as LinkIcon,
  Lock,
  Search,
  Users,
} from 'lucide-react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import { CreateClientInvitePanel } from '#/features/create-client-invite'
import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'
import { Card, CardBody, CardHeader } from '#/shared/ui/card'
import { Input } from '#/shared/ui/input'

type ClientListData = FunctionReturnType<typeof api.coachClients.listManagedClients>
type ClientRow = ClientListData['clients'][number]
type ClientDetailData = FunctionReturnType<typeof api.coachClients.getClientOverview>

export function CoachClientList() {
  if (!hasConfiguredConvexUrl()) {
    return <SetupState />
  }

  return <ConnectedCoachClientList />
}

export function CoachClientDetail({ clientId }: { clientId: string }) {
  if (!hasConfiguredConvexUrl()) {
    return <SetupState />
  }

  return <ConnectedCoachClientDetail clientId={clientId as Id<'users'>} />
}

function ConnectedCoachClientList() {
  const clientsQuery = useQuery(
    convexQuery(api.coachClients.listManagedClients, { limit: 100 }),
  )
  const [query, setQuery] = useState('')

  if (clientsQuery.isPending) {
    return <ClientListSkeleton />
  }

  if (clientsQuery.error) {
    return <ClientListError error={clientsQuery.error} />
  }

  if (!clientsQuery.data) {
    return <ClientListSkeleton />
  }

  const filteredClients = filterClients(clientsQuery.data.clients, query)

  return (
    <section className="grid gap-6">
      <ClientListHeader
        clients={clientsQuery.data.clients}
        rangeLabel={clientsQuery.data.rangeLabel}
      />

      <CreateClientInvitePanel />

      <Card>
        <CardHeader>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div>
              <p className="text-xs font-bold text-muted-foreground">
                Lista robocza
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground">
                Podopieczni
              </h2>
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                Szukaj po nazwie lub emailu
              </span>
              <Input
                leadingIcon={<Search aria-hidden="true" className="h-4 w-4" />}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Np. Anna albo anna@example.com"
                value={query}
              />
            </label>
          </div>
        </CardHeader>

        {clientsQuery.data.clients.length === 0 ? (
          <CardBody padding="lg">
            <EmptyState
              icon={Users}
              title="Nie masz jeszcze klientow"
            >
              Utworz link zaproszenia powyzej. Po akceptacji konto
              podopiecznego pojawi sie tutaj, a program aktywujesz osobnym
              przypisaniem.
            </EmptyState>
          </CardBody>
        ) : filteredClients.length === 0 ? (
          <CardBody padding="lg">
            <EmptyState icon={Search} title="Brak wynikow wyszukiwania">
              Zmien fraze wyszukiwania. Lista filtruje tylko klientow, do
              ktorych masz dostep jako coach.
            </EmptyState>
          </CardBody>
        ) : (
          <>
            <ClientTable clients={filteredClients} />
            <ClientMobileList clients={filteredClients} />
          </>
        )}
      </Card>
    </section>
  )
}

function ConnectedCoachClientDetail({
  clientId,
}: {
  clientId: Id<'users'>
}) {
  const detailQuery = useQuery(
    convexQuery(api.coachClients.getClientOverview, { traineeId: clientId }),
  )

  if (detailQuery.isPending) {
    return <ClientDetailSkeleton />
  }

  if (detailQuery.error) {
    return <ClientListError error={detailQuery.error} />
  }

  if (!detailQuery.data) {
    return <ClientDetailSkeleton />
  }

  return <ClientDetailContent detail={detailQuery.data} />
}

function ClientListHeader({
  clients,
  rangeLabel,
}: {
  clients: ClientRow[]
  rangeLabel: string
}) {
  const readyCount = clients.filter((client) => client.status === 'ready_for_review').length
  const noProgramCount = clients.filter((client) => client.status === 'no_program').length

  return (
    <header className="grid gap-5 border-b border-border pb-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">Panel trenera</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          Klienci
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Szybko sprawdz, kto ma aktywny program, kto ostatnio trenowal i gdzie
          przejsc do szczegolowych statystyk.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
        <SummaryFact label="Klienci" value={`${clients.length}`} />
        <SummaryFact label="Do review" value={`${readyCount}`} />
        <SummaryFact label="Bez programu" value={`${noProgramCount}`} meta={rangeLabel} />
      </dl>
    </header>
  )
}

function SummaryFact({
  label,
  meta,
  value,
}: {
  label: string
  meta?: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</dd>
      {meta ? (
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{meta}</p>
      ) : null}
    </div>
  )
}

function ClientTable({ clients }: { clients: ClientRow[] }) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-muted/45 text-xs font-bold text-muted-foreground">
            <th className="px-5 py-3">Klient</th>
            <th className="px-5 py-3">Program</th>
            <th className="px-5 py-3">Ostatni trening</th>
            <th className="px-5 py-3">Aktywnosc</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Akcja</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              className="border-b border-border last:border-b-0"
              key={client.trainee._id}
            >
              <td className="px-5 py-4">
                <ClientIdentity client={client} />
              </td>
              <td className="px-5 py-4">
                <ProgramCell client={client} />
              </td>
              <td className="px-5 py-4">
                <LastTrainingCell client={client} />
              </td>
              <td className="px-5 py-4">
                <ActivityCell client={client} />
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={client.status} />
              </td>
              <td className="px-5 py-4 text-right">
                <DetailLink clientId={client.trainee._id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientMobileList({ clients }: { clients: ClientRow[] }) {
  return (
    <div className="grid lg:hidden">
      {clients.map((client) => (
        <article
          className="grid gap-4 border-b border-border px-4 py-4 last:border-b-0 sm:px-5"
          key={client.trainee._id}
        >
          <div className="flex items-start justify-between gap-3">
            <ClientIdentity client={client} />
            <StatusBadge status={client.status} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MobileFact label="Program">
              <ProgramCell client={client} />
            </MobileFact>
            <MobileFact label="Ostatni trening">
              <LastTrainingCell client={client} />
            </MobileFact>
            <MobileFact label="Aktywnosc">
              <ActivityCell client={client} />
            </MobileFact>
          </div>
          <DetailLink clientId={client.trainee._id} />
        </article>
      ))}
    </div>
  )
}

function ClientIdentity({ client }: { client: ClientRow }) {
  const name = client.trainee.name || client.trainee.email || 'Klient'
  const initials = getInitials(name)

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-foreground">{name}</p>
        <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
          {client.trainee.email ?? 'Email nieuzupelniony'}
        </p>
      </div>
    </div>
  )
}

function ProgramCell({ client }: { client: ClientRow }) {
  if (!client.currentAssignment) {
    return (
      <span className="text-sm font-semibold text-muted-foreground">
        Brak programu
      </span>
    )
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-foreground">
        {client.currentAssignment.program.title}
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {client.currentAssignment.program.durationWeeks} tyg. od{' '}
        {formatDate(client.currentAssignment.assignedAt)}
      </p>
    </div>
  )
}

function LastTrainingCell({ client }: { client: ClientRow }) {
  if (!client.latestTrainingResult) {
    return (
      <span className="text-sm font-semibold text-muted-foreground">
        Brak wynikow
      </span>
    )
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-foreground">
        {client.latestTrainingResult.routineName ?? 'Trening'}
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {formatDate(client.latestTrainingResult.completedAt)}
        {client.latestTrainingResult.durationMinutes
          ? `, ${formatMinutes(client.latestTrainingResult.durationMinutes)}`
          : ''}
      </p>
    </div>
  )
}

function ActivityCell({ client }: { client: ClientRow }) {
  return (
    <div className="text-sm font-semibold text-foreground">
      <span className="tabular-nums">
        {client.recentActivity.completedTrainingCount}
      </span>{' '}
      treningow
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {client.recentActivity.rangeLabel}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: ClientRow['status'] }) {
  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-md px-2.5 text-xs font-bold ${config.className}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {config.label}
    </span>
  )
}

function DetailLink({ clientId }: { clientId: Id<'users'> }) {
  return (
    <Link
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      params={{ clientId }}
      search={{ clientId: undefined }}
      to="/clients/$clientId"
    >
      Zobacz statystyki
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  )
}

function MobileFact({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-3">
      <p className="mb-2 text-xs font-bold text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function ClientDetailContent({ detail }: { detail: ClientDetailData }) {
  const title = detail.trainee.name || detail.trainee.email || 'Klient'

  return (
    <section className="grid gap-6">
      <header className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            search={{ clientId: undefined }}
            to="/clients"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Klienci
          </Link>
          <p className="mt-3 text-sm font-semibold text-primary">Statystyki klienta</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Coach-facing podglad tego samego zrodla treningow, ktore zasila
            dashboard podopiecznego. Pelne wykresy i zdjecia progresu zostaja
            w osobnym detail pass.
          </p>
        </div>
        <StatusBadge status={detail.status} />
      </header>

      <Card>
        <CardBody padding="lg">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Users aria-hidden="true" className="h-4 w-4" />
                Profil klienta
              </div>
              <h2 className="mt-2 text-2xl font-bold text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {detail.trainee.email ?? 'Email nieuzupelniony'}
              </p>
            </div>
            <div className="grid gap-3">
              <ProgramMiniPanel detail={detail} />
            </div>
          </div>
        </CardBody>
      </Card>

      <section
        aria-label="Statystyki tygodnia klienta"
        className="grid gap-3 sm:grid-cols-3"
      >
        <MetricTile
          icon={Clock3}
          label="Czas"
          meta={detail.week.rangeLabel}
          value={formatMinutes(detail.week.durationMinutes)}
        />
        <MetricTile
          icon={CheckCircle2}
          label="Serie"
          meta={detail.week.rangeLabel}
          value={`${detail.week.completedSets} serii`}
        />
        <MetricTile
          icon={Activity}
          label="Wolumen"
          meta="Tylko serie z kg i powt."
          value={detail.week.volumeKg > 0 ? `${formatNumber(detail.week.volumeKg)} kg` : 'Brak danych'}
        />
      </section>

      <Card>
        <CardHeader>
          <p className="text-xs font-bold text-muted-foreground">
            Ostatni trening i aktywnosc
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            Szybki kontekst do review
          </h2>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 lg:grid-cols-2">
            <MobileFact label="Ostatni trening">
              <LastTrainingCell client={detail} />
            </MobileFact>
            <MobileFact label="Aktywnosc">
              <ActivityCell client={detail} />
            </MobileFact>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function ProgramMiniPanel({ detail }: { detail: ClientDetailData }) {
  if (!detail.currentAssignment) {
    return (
      <div className="rounded-md border border-border bg-background px-3 py-3">
        <p className="text-xs font-bold text-muted-foreground">Program</p>
        <p className="mt-1 text-sm font-bold text-foreground">Brak programu</p>
        <Link
          className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 text-xs font-bold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          to="/assignments"
        >
          Aktywuj program
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border bg-background px-3 py-3">
      <p className="text-xs font-bold text-muted-foreground">Aktualny program</p>
      <p className="mt-1 truncate text-sm font-bold text-foreground">
        {detail.currentAssignment.program.title}
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {detail.currentAssignment.program.durationWeeks} tyg.
      </p>
    </div>
  )
}

function MetricTile({
  icon: Icon,
  label,
  meta,
  value,
}: {
  icon: typeof Clock3
  label: string
  meta: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{meta}</p>
    </div>
  )
}

function EmptyState({
  action,
  children,
  icon: Icon,
  title,
}: {
  action?: { label: string; to: '/assignments' }
  children: React.ReactNode
  icon: typeof Users
  title: string
}) {
  return (
    <div className="mx-auto flex max-w-2xl items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
        {action ? (
          <Link
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            to={action.to}
          >
            {action.label}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function ClientListSkeleton() {
  return (
    <section className="grid gap-6">
      <header className="border-b border-border pb-5">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="mt-3 h-10 max-w-md rounded-md bg-muted" />
        <div className="mt-4 h-16 max-w-2xl rounded-md bg-muted" />
      </header>
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="h-11 max-w-sm rounded-md bg-muted" />
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="h-16 rounded-md bg-muted" key={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ClientDetailSkeleton() {
  return (
    <section className="grid gap-6">
      <header className="border-b border-border pb-5">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="mt-3 h-10 max-w-md rounded-md bg-muted" />
        <div className="mt-4 h-16 max-w-2xl rounded-md bg-muted" />
      </header>
      <div className="h-44 rounded-lg border border-border bg-card p-5" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-32 rounded-lg border border-border bg-card" />
        <div className="h-32 rounded-lg border border-border bg-card" />
        <div className="h-32 rounded-lg border border-border bg-card" />
      </div>
    </section>
  )
}

function ClientListError({ error }: { error: Error }) {
  const normalizedMessage = error.message.toLocaleLowerCase('pl-PL')
  const isAccessError =
    normalizedMessage.includes('access') ||
    normalizedMessage.includes('dostep')

  return (
    <StateFrame
      icon={isAccessError ? Lock : AlertCircle}
      title={
        isAccessError
          ? 'Nie masz dostepu do klientow'
          : 'Nie mozemy pobrac listy klientow'
      }
      tone={isAccessError ? 'warning' : 'error'}
    >
      Odswiez strone albo wroc pozniej. Szczegoly: {error.message}
    </StateFrame>
  )
}

function SetupState() {
  return (
    <StateFrame icon={LinkIcon} title="Convex nie jest podlaczony" tone="warning">
      Ustaw `VITE_CONVEX_URL`, zeby wlaczyc autoryzowana liste klientow.
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
  tone: 'error' | 'warning'
}) {
  const iconClass =
    tone === 'error'
      ? 'bg-destructive text-destructive-foreground'
      : 'bg-accent text-accent-foreground'

  return (
    <section className="grid min-h-[calc(100vh-9rem)] place-items-center">
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
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

function filterClients(clients: ClientRow[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL')

  if (!normalizedQuery) {
    return clients
  }

  return clients.filter((client) => {
    const name = client.trainee.name?.toLocaleLowerCase('pl-PL') ?? ''
    const email = client.trainee.email?.toLocaleLowerCase('pl-PL') ?? ''
    const program =
      client.currentAssignment?.program.title.toLocaleLowerCase('pl-PL') ?? ''

    return (
      name.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      program.includes(normalizedQuery)
    )
  })
}

function getStatusConfig(status: ClientRow['status']) {
  switch (status) {
    case 'ready_for_review':
      return {
        className: 'bg-accent text-accent-foreground',
        icon: CheckCircle2,
        label: 'Do review',
      }
    case 'no_program':
      return {
        className: 'bg-muted text-muted-foreground',
        icon: Dumbbell,
        label: 'Bez programu',
      }
    case 'no_results':
      return {
        className: 'bg-secondary text-secondary-foreground',
        icon: CalendarClock,
        label: 'Bez wynikow',
      }
    case 'inactive_recently':
      return {
        className: 'bg-muted text-foreground',
        icon: Clock3,
        label: 'Cisza ostatnio',
      }
  }
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2)
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(timestamp)
}

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 0,
  }).format(value)
}
