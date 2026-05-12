interface CoachPageProps {
  title: string
  eyebrow?: string
}

export function CoachPage({ eyebrow = 'Panel trenera', title }: CoachPageProps) {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          {title}
        </h1>
      </header>

      <div
        aria-label={`${title}: pusta strona robocza`}
        className="min-h-[28rem] rounded-lg border border-dashed border-border bg-card"
      />
    </section>
  )
}
