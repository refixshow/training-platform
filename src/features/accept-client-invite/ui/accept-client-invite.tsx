import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Link as LinkIcon,
  Lock,
  UserPlus,
} from 'lucide-react'
import { api } from '../../../../convex/_generated/api'

import { EmailPasswordAuthScreen } from '#/features/auth-email-password'
import { hasConfiguredConvexUrl } from '#/shared/lib/convex-env'
import { Card, CardBody } from '#/shared/ui/card'

type AcceptState = 'idle' | 'submitting' | 'success' | 'error'

export function AcceptClientInvite({ token }: { token: string }) {
  if (!hasConfiguredConvexUrl()) {
    return (
      <InviteFrame icon={LinkIcon} title="Convex nie jest podlaczony" tone="warning">
        Ustaw `VITE_CONVEX_URL`, zeby obslugiwac zaproszenia klientow.
      </InviteFrame>
    )
  }

  return <ConnectedAcceptClientInvite token={token} />
}

function ConnectedAcceptClientInvite({ token }: { token: string }) {
  const preview = useQuery(api.clientInvites.getInvitePreview, { token })
  const currentUser = useQuery(api.auth.currentUser)
  const acceptInvite = useMutation(api.clientInvites.acceptInvite)
  const [acceptState, setAcceptState] = useState<AcceptState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (
      preview?.status !== 'pending' ||
      currentUser === undefined ||
      currentUser === null ||
      currentUser.role !== 'trainee' ||
      acceptState !== 'idle'
    ) {
      return
    }

    setAcceptState('submitting')
    setError(null)
    acceptInvite({ token })
      .then(() => {
        setAcceptState('success')
      })
      .catch((caughtError) => {
        setAcceptState('error')
        setError(getErrorMessage(caughtError))
      })
  }, [acceptInvite, acceptState, currentUser, preview?.status, token])

  if (preview === undefined || currentUser === undefined) {
    return <InviteSkeleton />
  }

  if (preview.status !== 'pending') {
    return <InviteTerminalState previewStatus={preview.status} />
  }

  if (currentUser === null) {
    return (
      <EmailPasswordAuthScreen
        defaultMode="signUp"
        subtitle="Utworz konto podopiecznego albo zaloguj sie, a po autoryzacji polaczymy je z trenerem z zaproszenia."
        title={`Dolacz do ${preview.coach?.name ?? 'trenera'}`}
      />
    )
  }

  if (currentUser.role !== 'trainee') {
    return (
      <InviteFrame icon={Lock} title="To konto nie moze przyjac zaproszenia" tone="warning">
        Zaproszenia klientow sa przeznaczone dla kont podopiecznych. Zaloguj sie
        na konto trainee albo utworz nowe konto z linku.
      </InviteFrame>
    )
  }

  if (acceptState === 'success') {
    return (
      <InviteFrame icon={CheckCircle2} title="Konto polaczone z trenerem" tone="success">
        <p>
          Teraz trener widzi Cie na liscie klientow. Jesli nie masz jeszcze
          aktywnego programu, zobaczysz spokojny stan oczekiwania.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          to="/my-program"
        >
          <ClipboardList aria-hidden="true" className="h-4 w-4" />
          Przejdz do programu
        </Link>
      </InviteFrame>
    )
  }

  if (acceptState === 'error') {
    return (
      <InviteFrame icon={AlertCircle} title="Nie mozemy przyjac zaproszenia" tone="error">
        {error ?? 'Sprobuj odswiezyc strone albo popros trenera o nowy link.'}
      </InviteFrame>
    )
  }

  return (
    <InviteFrame icon={UserPlus} title="Laczymy konto z trenerem" tone="warning">
      Sprawdzamy zaproszenie i przypisujemy konto podopiecznego do trenera.
    </InviteFrame>
  )
}

function InviteTerminalState({
  previewStatus,
}: {
  previewStatus: 'accepted' | 'already_connected' | 'expired' | 'invalid' | 'revoked'
}) {
  const copy = {
    accepted: {
      icon: CheckCircle2,
      title: 'Zaproszenie zostalo juz wykorzystane',
      tone: 'warning' as const,
      body: 'Popros trenera o nowy link, jesli to konto nadal ma zostac przypisane.',
    },
    already_connected: {
      icon: CheckCircle2,
      title: 'Konto jest juz polaczone z trenerem',
      tone: 'success' as const,
      body: 'Mozesz przejsc do swojego programu. Jesli coach nie aktywowal jeszcze planu, zobaczysz stan oczekiwania.',
    },
    expired: {
      icon: AlertCircle,
      title: 'Link wygasl',
      tone: 'warning' as const,
      body: 'Zaproszenia sa wazne przez 7 dni. Popros trenera o nowy link.',
    },
    invalid: {
      icon: AlertCircle,
      title: 'Nieprawidlowy link',
      tone: 'error' as const,
      body: 'Sprawdz, czy adres zostal skopiowany w calosci.',
    },
    revoked: {
      icon: Lock,
      title: 'Zaproszenie zostalo cofniete',
      tone: 'warning' as const,
      body: 'Ten link nie moze juz przypisac konta do trenera.',
    },
  }[previewStatus]

  return (
    <InviteFrame icon={copy.icon} title={copy.title} tone={copy.tone}>
      {copy.body}
    </InviteFrame>
  )
}

function InviteFrame({
  children,
  icon: Icon,
  title,
  tone,
}: {
  children: React.ReactNode
  icon: typeof AlertCircle
  title: string
  tone: 'error' | 'success' | 'warning'
}) {
  const iconClass =
    tone === 'error'
      ? 'bg-destructive text-destructive-foreground'
      : tone === 'success'
        ? 'bg-accent text-accent-foreground'
        : 'bg-secondary text-secondary-foreground'

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-foreground">
      <Card>
        <CardBody padding="lg">
          <div className="mx-auto max-w-xl">
            <span className={`flex h-12 w-12 items-center justify-center rounded-md ${iconClass}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-foreground">{title}</h1>
            <div className="mt-3 text-sm leading-6 text-muted-foreground">
              {children}
            </div>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}

function InviteSkeleton() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <Card>
        <CardBody padding="lg">
          <div className="w-full max-w-xl">
            <div className="h-12 w-12 rounded-md bg-muted" />
            <div className="mt-5 h-8 max-w-sm rounded-md bg-muted" />
            <div className="mt-4 h-16 max-w-xl rounded-md bg-muted" />
            <div className="mt-6 h-11 w-44 rounded-md bg-muted" />
          </div>
        </CardBody>
      </Card>
    </main>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Nie udalo sie przyjac zaproszenia.'
}
