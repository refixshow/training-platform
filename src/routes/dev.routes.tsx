import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  Activity,
  Dumbbell,
  Layers3,
  ListChecks,
  Route as RouteIcon,
  Users,
} from 'lucide-react'

import { api } from '../../convex/_generated/api'
import { Card, CardBody, CardHeader } from '#/shared/ui/card'
import {
  demoAccounts,
  getDevToolsKey,
  isDevToolsEnabled,
  type DemoRole,
} from '#/shared/lib/dev-tools'
import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'

export const Route = createFileRoute('/dev/routes')({
  component: DevRoutesPage,
  validateSearch: (search) => ({
    setup: isDemoRole(search.setup) ? search.setup : undefined,
  }),
})

type SetupStatus = 'idle' | 'running' | 'success' | 'error'

const coachRoutes = [
  { label: 'Clients', to: '/clients' },
  { label: 'Exercises', to: '/exercises' },
  { label: 'Routines', to: '/routines' },
  { label: 'Programs', to: '/programs' },
  { label: 'Assignments', to: '/assignments' },
] as const

const traineeRoutes = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'My program', to: '/my-program' },
  { label: 'Workout logging', to: '/my-program/training' },
] as const

function DevRoutesPage() {
  if (!isDevToolsEnabled()) {
    return <DevDisabledState />
  }

  if (!hasConfiguredConvexUrl()) {
    return <DevMissingConvexState />
  }

  return <ConnectedDevRoutesPage />
}

function ConnectedDevRoutesPage() {
  const search = Route.useSearch()
  const currentUser = useQuery(api.auth.currentUser)
  const ensureDemoWorkspace = useMutation(api.dev.ensureDemoWorkspace)
  const hasRunSetup = useRef(false)
  const [status, setStatus] = useState<SetupStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (
      !search.setup ||
      hasRunSetup.current ||
      currentUser === undefined ||
      currentUser === null
    ) {
      return
    }

    hasRunSetup.current = true
    setStatus('running')
    setMessage(`Preparing ${search.setup} demo workspace...`)

    ensureDemoWorkspace({
      devToolsKey: getDevToolsKey(),
      role: search.setup,
    })
      .then((result) => {
        setStatus('success')
        setMessage(
          `Demo ready for ${result.email}. Seeded ${result.exerciseCount} exercises, one routine, one program, and one assignment.`,
        )
      })
      .catch((error: unknown) => {
        hasRunSetup.current = false
        setStatus('error')
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not prepare demo workspace.',
        )
      })
  }, [currentUser, ensureDemoWorkspace, search.setup])

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Local dev</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal">
              Demo routes and setup
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Use this page to prepare deterministic data, then jump straight to
              the route you want to audit.
            </p>
          </div>

          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            to="/login"
          >
            Switch account
          </Link>
        </header>

        <DevSetupCard
          currentEmail={currentUser?.email ?? null}
          currentRole={currentUser?.role ?? null}
          message={message}
          setup={search.setup}
          status={status}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <RouteGroup
            description="Coach-facing programming and review surfaces."
            icon={<Users aria-hidden="true" className="h-5 w-5" />}
            routes={coachRoutes}
            title="Coach routes"
          />
          <RouteGroup
            description="Trainee-facing training and assignment surfaces."
            icon={<Activity aria-hidden="true" className="h-5 w-5" />}
            routes={traineeRoutes}
            title="Trainee routes"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <DemoFact
            icon={<Dumbbell aria-hidden="true" className="h-4 w-4" />}
            label="Coach"
            value={demoAccounts.coach.email}
          />
          <DemoFact
            icon={<Users aria-hidden="true" className="h-4 w-4" />}
            label="Trainee"
            value={demoAccounts.trainee.email}
          />
          <DemoFact
            icon={<Layers3 aria-hidden="true" className="h-4 w-4" />}
            label="Password"
            value={demoAccounts.coach.password}
          />
        </section>
      </div>
    </main>
  )
}

function DevSetupCard({
  currentEmail,
  currentRole,
  message,
  setup,
  status,
}: {
  currentEmail: string | null
  currentRole: string | null
  message: string | null
  setup?: DemoRole
  status: SetupStatus
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks aria-hidden="true" className="h-4 w-4 text-primary" />
          Workspace status
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {currentEmail
                ? `${currentEmail} (${currentRole ?? 'role pending'})`
                : 'No active session'}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {message ??
                (setup
                  ? 'Waiting for the authenticated session before setup starts.'
                  : 'Choose a demo login shortcut, or open any route below with the current session.')}
            </p>
          </div>
          <span className={getStatusBadgeClass(status)}>
            {status === 'running'
              ? 'Preparing'
              : status === 'success'
                ? 'Ready'
                : status === 'error'
                  ? 'Needs setup'
                  : 'Idle'}
          </span>
        </div>
      </CardBody>
    </Card>
  )
}

function RouteGroup({
  description,
  icon,
  routes,
  title,
}: {
  description: string
  icon: React.ReactNode
  routes: readonly { label: string; to: string }[]
  title: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardBody>
        <div className="grid gap-2">
          {routes.map((route) => (
            <Link
              className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              key={route.to}
              to={route.to}
            >
              {route.label}
              <RouteIcon aria-hidden="true" className="h-4 w-4 text-primary" />
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function DemoFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-all text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}

function DevDisabledState() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-center text-foreground">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Dev tools are disabled</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Set VITE_ENABLE_DEV_TOOLS=true in local development to use this route.
        </p>
      </div>
    </main>
  )
}

function DevMissingConvexState() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-center text-foreground">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Convex is not configured</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Set VITE_CONVEX_URL before preparing demo accounts and workspace data.
        </p>
      </div>
    </main>
  )
}

function getStatusBadgeClass(status: SetupStatus) {
  const base =
    'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-bold'

  if (status === 'success') {
    return `${base} bg-accent text-accent-foreground`
  }

  if (status === 'error') {
    return `${base} bg-muted text-destructive`
  }

  return `${base} bg-secondary text-secondary-foreground`
}

function isDemoRole(value: unknown): value is DemoRole {
  return value === 'coach' || value === 'trainee'
}
