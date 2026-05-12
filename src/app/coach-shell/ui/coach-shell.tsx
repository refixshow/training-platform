import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useAuthActions } from '@convex-dev/auth/react'

import {
  getCoachNavItemsForRole,
  type NavigationRole,
} from '../model/coach-navigation'

interface CoachShellProps {
  children: ReactNode
  role?: Extract<NavigationRole, 'admin' | 'coach'>
  showAuthActions?: boolean
}

export function CoachShell({
  children,
  role = 'coach',
  showAuthActions = true,
}: CoachShellProps) {
  const navItems = getCoachNavItemsForRole(role)

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-b border-border bg-secondary/45 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-5 px-4 py-4 lg:sticky lg:top-0 lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link
              aria-label="Panel trenera"
              className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              search={{ clientId: undefined }}
              to="/clients"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                TP
              </span>
              <span>
                <span className="block text-sm font-bold text-foreground">
                  Training Platform
                </span>
                <span className="block text-xs font-medium text-muted-foreground">
                  Coach workspace
                </span>
              </span>
            </Link>
          </div>

          <nav aria-label="Strony panelu trenera" className="min-w-0">
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {navItems.map((item) => {
                const Icon = item.icon

                return (
                  <li className="shrink-0 lg:shrink" key={item.to}>
                    <Link
                      activeOptions={{ exact: item.to === '/clients' }}
                      activeProps={{
                        className:
                          'bg-card text-foreground shadow-sm ring-1 ring-border',
                      }}
                      className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:bg-card/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      inactiveProps={{
                        className: 'bg-transparent',
                      }}
                      to={item.to}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {showAuthActions ? <CoachSignOut /> : null}
        </div>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  )
}

function CoachSignOut() {
  const { signOut } = useAuthActions()

  return (
    <div className="mt-auto border-t border-border pt-4">
      <button
        className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:bg-card/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => {
          void signOut()
        }}
        type="button"
      >
        <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
        Wyloguj
      </button>
    </div>
  )
}
