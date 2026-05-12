import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { AlertCircle, Dumbbell, LogIn, UserPlus } from 'lucide-react'

import { Button } from '#/shared/ui/button'
import { Card, CardBody } from '#/shared/ui/card'
import { Input } from '#/shared/ui/input'

type AuthMode = 'signIn' | 'signUp'

export function EmailPasswordAuthScreen({
  defaultMode = 'signIn',
  subtitle,
  title,
}: {
  defaultMode?: AuthMode
  subtitle?: string
  title?: string
} = {}) {
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setStatus(null)

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (!trimmedEmail) {
      setError('Wpisz adres email.')
      return
    }

    if (password.length < 8) {
      setError('Haslo musi miec przynajmniej 8 znakow.')
      return
    }

    if (mode === 'signUp' && !trimmedName) {
      setError('Wpisz imie i nazwisko albo nazwe konta.')
      return
    }

    setIsSubmitting(true)
    setStatus(
      mode === 'signIn'
        ? 'Lacze z Convex Auth...'
        : 'Tworze konto w Convex Auth...',
    )

    try {
      const payload: Record<string, string> = {
        email: trimmedEmail,
        flow: mode,
        password,
      }

      if (mode === 'signUp') {
        payload.name = trimmedName
      }

      const result = await signIn('password', payload)

      if (result.redirect) {
        setStatus('Przekierowuje do logowania...')
        return
      }

      if (result.signingIn) {
        setStatus(
          mode === 'signIn'
            ? 'Zalogowano. Otwieram panel...'
            : 'Konto gotowe. Otwieram panel...',
        )
        return
      }

      setStatus('Convex Auth przyjal dane. Sprawdzam sesje...')
    } catch (caughtError) {
      setStatus(null)
      setError(getAuthErrorMessage(caughtError, mode))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_32rem] lg:px-0 lg:py-0">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-center gap-8 lg:min-h-screen lg:px-10">
        <div className="max-w-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            TP
          </span>
          <p className="mt-8 text-sm font-semibold text-primary">
            Training Platform
          </p>
          <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-normal text-foreground sm:text-4xl">
            {title ?? 'Zaloguj sie do uporzadkowanego panelu trenera'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            {subtitle ??
              'Jeden login odblokowuje biblioteke cwiczen, rutyny, programy i review wynikow. Konto trenera ma dostep do narzedzi programowania, konto podopiecznego otwiera widok przypisanego programu.'}
          </p>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <AuthPoint title="Coach" value="programowanie" />
          <AuthPoint title="Trainee" value="treningi" />
          <AuthPoint title="Convex Auth" value="email + haslo" />
        </div>
      </section>

      <aside className="mx-auto mt-8 w-full max-w-md self-center lg:mx-0 lg:mt-0 lg:min-h-screen lg:border-l lg:border-border lg:bg-secondary/35 lg:px-8 lg:py-10">
        <Card>
          <CardBody padding="lg">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Dumbbell aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {mode === 'signIn' ? 'Logowanie' : 'Nowe konto'}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {mode === 'signIn'
                    ? 'Wpisz email i haslo ustawione przy rejestracji.'
                    : 'Nowe konto startuje jako podopieczny. Role coach/admin ustawiasz pozniej w bazie.'}
                </p>
              </div>
            </div>

            <form className="mt-6 grid gap-4" noValidate onSubmit={handleSubmit}>
              {mode === 'signUp' ? (
                <Field label="Nazwa konta" name="name">
                  <Input
                    autoComplete="name"
                    disabled={isSubmitting}
                    id="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Np. Adam Coach"
                    value={name}
                  />
                </Field>
              ) : null}

              <Field label="Email" name="email">
                <Input
                  autoComplete="email"
                  disabled={isSubmitting}
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="coach@example.com"
                  type="email"
                  value={email}
                />
              </Field>

              <Field label="Haslo" name="password">
                <Input
                  autoComplete={
                    mode === 'signIn' ? 'current-password' : 'new-password'
                  }
                  disabled={isSubmitting}
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 znakow"
                  type="password"
                  value={password}
                />
              </Field>

              <div aria-live="polite" className="min-h-5">
                {error ? (
                  <p className="flex items-start gap-2 text-sm font-medium leading-6 text-destructive">
                    <AlertCircle
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <span>{error}</span>
                  </p>
                ) : status ? (
                  <p className="text-sm font-medium leading-6 text-primary">
                    {status}
                  </p>
                ) : null}
              </div>

              <Button disabled={isSubmitting} type="submit">
                {mode === 'signIn' ? (
                  <LogIn aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <UserPlus aria-hidden="true" className="h-4 w-4" />
                )}
                {isSubmitting
                  ? 'Przetwarzanie...'
                  : mode === 'signIn'
                    ? 'Zaloguj'
                    : 'Utworz konto'}
              </Button>
            </form>

            <div className="mt-5 border-t border-border pt-5">
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  setError(null)
                  setStatus(null)
                  setMode((current) =>
                    current === 'signIn' ? 'signUp' : 'signIn',
                  )
                }}
                type="button"
                variant="secondary"
              >
                {mode === 'signIn'
                  ? 'Nie masz konta? Utworz je'
                  : 'Masz konto? Zaloguj sie'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </aside>
    </main>
  )
}

function Field({
  children,
  label,
  name,
}: {
  children: React.ReactNode
  label: string
  name: string
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      {children}
    </div>
  )
}

function AuthPoint({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-xs font-bold text-muted-foreground">{title}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  )
}

function getAuthErrorMessage(error: unknown, mode: AuthMode) {
  const message = error instanceof Error ? error.message : ''

  if (message.includes('InvalidAccountId') || message.includes('InvalidSecret')) {
    return 'Email albo haslo sie nie zgadza. Sprawdz dane i sprobuj ponownie.'
  }

  if (message.includes('Invalid credentials')) {
    return 'Email albo haslo sie nie zgadza. Sprawdz dane i sprobuj ponownie.'
  }

  if (message.includes('AccountAlreadyLinked')) {
    return 'Konto z tym adresem email juz istnieje. Przejdz do logowania.'
  }

  if (message.includes('Password')) {
    return 'Haslo musi miec przynajmniej 8 znakow.'
  }

  return mode === 'signIn'
    ? 'Nie udalo sie zalogowac. Sprawdz dane i sprobuj ponownie.'
    : 'Nie udalo sie utworzyc konta. Sprobuj ponownie.'
}
