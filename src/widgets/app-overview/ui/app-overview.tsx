import {
  Activity,
  BarChart3,
  Camera,
  ClipboardList,
  Dumbbell,
  Users,
} from 'lucide-react'

import { Button } from '#/shared/ui/button'

import {
  coachStats,
  productModules,
  traineeSetTargets,
} from './app-overview.constants'

const moduleIcons = [Dumbbell, ClipboardList, Users, Activity, Camera, BarChart3]

export function AppOverview() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              Coaching platform
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-normal text-foreground sm:text-5xl">
              Training management that stays simple for trainees and detailed
              for coaches.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              A TanStack Start foundation for programs, routines, workout
              logging, progress photos, and coach-side review.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">Open coach view</Button>
            <Button size="lg" variant="secondary">
              Preview trainee flow
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  Coach workspace
                </p>
                <h2 className="mt-1 text-2xl font-bold text-card-foreground">
                  Review queue
                </h2>
              </div>
              <span className="rounded-md bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
                Live data ready
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {coachStats.map((stat) => (
                <article
                  className="rounded-md border border-border bg-background p-4"
                  key={stat.label}
                >
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {stat.detail}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-md border border-border">
              <div className="grid grid-cols-[1fr_auto] border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground">
                <span>Client signal</span>
                <span>Status</span>
              </div>
              {[
                ['Marta K.', 'Training summary submitted'],
                ['Adam P.', 'Bodyweight trend changed'],
                ['Julia R.', 'Progress photos uploaded'],
              ].map(([name, status]) => (
                <div
                  className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-sm"
                  key={name}
                >
                  <span className="font-semibold text-foreground">{name}</span>
                  <span className="text-muted-foreground">{status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold text-muted-foreground">
              Trainee workout
            </p>
            <h2 className="mt-1 text-2xl font-bold text-card-foreground">
              Today: Lower strength
            </h2>
            <div className="mt-6 space-y-3">
              {traineeSetTargets.map((target, index) => (
                <article
                  className="grid grid-cols-[auto_1fr] gap-4 rounded-md border border-border bg-background p-4"
                  key={target.exercise}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-sm font-bold text-secondary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-foreground">
                        {target.exercise}
                      </h3>
                      <span className="text-sm font-semibold text-primary">
                        {target.target}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {target.detail}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <Button size="lg" variant="primary">
              Start logging
            </Button>
          </section>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productModules.map((module, index) => {
            const Icon = moduleIcons[index]

            return (
              <article
                className="flex items-center gap-3 rounded-md border border-border bg-card p-4"
                key={module}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  {Icon ? <Icon aria-hidden="true" className="h-5 w-5" /> : null}
                </span>
                <span className="font-semibold text-card-foreground">
                  {module}
                </span>
              </article>
            )
          })}
        </section>
      </section>
    </main>
  )
}
