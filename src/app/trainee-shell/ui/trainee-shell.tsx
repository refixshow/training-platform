import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useAuthActions } from '@convex-dev/auth/react'

import {
  getTraineeNavItemsForRole,
  type NavigationRole,
} from '../model/trainee-navigation'

interface TraineeShellProps {
  children: ReactNode
  role?: Extract<NavigationRole, 'trainee'>
}

export function TraineeShell({ children, role = 'trainee' }: TraineeShellProps) {
  const navItems = getTraineeNavItemsForRole(role)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            aria-label="Widok podopiecznego"
            className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            to="/dashboard"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              TP
            </span>
            <span>
              <span className="block text-sm font-bold text-foreground">
                Training Platform
              </span>
              <span className="block text-xs font-medium text-muted-foreground">
                Widok podopiecznego
              </span>
            </span>
          </Link>

          <TraineeDesktopNav navItems={navItems} />

          <TraineeSignOut />
        </div>
      </header>

      <main className="min-w-0 px-4 pb-24 pt-5 sm:px-6 sm:pb-5 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <TraineeMobileNav navItems={navItems} />
    </div>
  )
}

function TraineeDesktopNav({
  navItems,
}: {
  navItems: ReturnType<typeof getTraineeNavItemsForRole>
}) {
  return (
    <nav aria-label="Strony podopiecznego" className="hidden sm:block">
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <Link
              activeProps={{
                className: 'bg-card text-foreground ring-1 ring-border',
              }}
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              key={item.to}
              to={item.to}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function TraineeMobileNav({
  navItems,
}: {
  navItems: ReturnType<typeof getTraineeNavItemsForRole>
}) {
  return (
    <nav
      aria-label="Strony podopiecznego"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur sm:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <Link
              activeProps={{
                className: 'bg-card text-foreground ring-1 ring-border',
              }}
              className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-2 text-center text-sm font-bold leading-tight text-muted-foreground transition-colors hover:bg-card/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              key={item.to}
              to={item.to}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function TraineeSignOut() {
  const { signOut } = useAuthActions()

  return (
    <button
      aria-label="Wyloguj"
      className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={() => {
        void signOut()
      }}
      type="button"
    >
      <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Wyloguj</span>
    </button>
  )
}
