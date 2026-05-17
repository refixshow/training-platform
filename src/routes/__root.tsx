import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Navigate,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from 'convex/react'

import { CoachShell } from '#/app/coach-shell'
import { TraineeShell } from '#/app/trainee-shell'
import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'
import { isDevToolsEnabled } from '#/shared/lib/dev-tools'
import { api } from '../../convex/_generated/api'

import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Coaching Platform',
      },
      {
        name: 'description',
        content:
          'A clear coaching platform for programs, workout logging, and progress review.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const isDevRoute = useIsDevRoute()
  const isInviteRoute = useIsInviteRoute()
  const isLoginRoute = useIsLoginRoute()

  if (!hasConfiguredConvexUrl()) {
    return (
      <RootDocument>
        {isDevRoute && isDevToolsEnabled() ? (
          <Outlet />
        ) : isInviteRoute ? (
          <Outlet />
        ) : isLoginRoute ? (
          <Navigate search={{ clientId: undefined }} to="/clients" />
        ) : (
          <CoachShell showAuthActions={false}>
            <Outlet />
          </CoachShell>
        )}
      </RootDocument>
    )
  }

  return (
    <RootDocument>
      <AuthLoading>
        <AuthLoadingScreen />
      </AuthLoading>
      <Unauthenticated>
        {isInviteRoute || isLoginRoute || (isDevRoute && isDevToolsEnabled()) ? (
          <Outlet />
        ) : (
          <Navigate to="/login" />
        )}
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
    </RootDocument>
  )
}

function AuthenticatedApp() {
  const isDevRoute = useIsDevRoute()
  const isInviteRoute = useIsInviteRoute()
  const isLoginRoute = useIsLoginRoute()
  const user = useQuery(api.auth.currentUser)

  if (user === undefined) {
    return <AuthLoadingScreen />
  }

  if (isInviteRoute) {
    return <Outlet />
  }

  if (isDevRoute && isDevToolsEnabled()) {
    return <Outlet />
  }

  if (isLoginRoute) {
    return <Navigate to="/" />
  }

  if (user?.role === 'coach' || user?.role === 'admin') {
    return (
      <CoachShell role={user.role}>
        <Outlet />
      </CoachShell>
    )
  }

  return (
    <TraineeShell role="trainee">
      <Outlet />
    </TraineeShell>
  )
}

function useIsInviteRoute() {
  return useRouterState({
    select: (state) => state.location.pathname.startsWith('/invite/'),
  })
}

function useIsDevRoute() {
  return useRouterState({
    select: (state) => state.location.pathname.startsWith('/dev/'),
  })
}

function useIsLoginRoute() {
  return useRouterState({
    select: (state) => state.location.pathname === '/login',
  })
}

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-center text-foreground">
      <div>
        <div className="mx-auto h-10 w-48 rounded-md bg-muted" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Sprawdzanie sesji...
        </p>
      </div>
    </main>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pl" className="bg-background text-foreground">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
