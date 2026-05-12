import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Link2,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardFooter, CardHeader } from '#/shared/ui/card'
import { Input, Textarea } from '#/shared/ui/input'

type CoachInvite = FunctionReturnType<
  typeof api.clientInvites.listInvitesByCoach
>[number]

export function CreateClientInvitePanel() {
  const createInvite = useMutation(api.clientInvites.createInvite)
  const revokeInvite = useMutation(api.clientInvites.revokeInvite)
  const invites = useQuery(api.clientInvites.listInvitesByCoach, { limit: 6 })
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<Id<'clientInvites'> | null>(null)

  const pendingCount = useMemo(
    () => invites?.filter((invite) => invite.effectiveStatus === 'pending').length ?? 0,
    [invites],
  )

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setCopiedLink(false)
    setIsSubmitting(true)

    try {
      const invite = await createInvite({
        intendedEmail: email.trim() || undefined,
        note: note.trim() || undefined,
      })
      const link = `${window.location.origin}/invite/${invite.token}`

      setCreatedLink(link)
      setMessage(`Link jest wazny do ${formatDateTime(invite.expiresAt)}.`)
      setEmail('')
      setNote('')
    } catch (caughtError) {
      setCreatedLink(null)
      setError(getErrorMessage(caughtError, 'Nie udalo sie utworzyc zaproszenia.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCopy() {
    if (!createdLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(createdLink)
      setCopiedLink(true)
      setMessage('Link skopiowany do schowka.')
    } catch {
      setCopiedLink(false)
      setError('Nie udalo sie skopiowac linku. Zaznacz go recznie.')
    }
  }

  async function handleRevoke(inviteId: Id<'clientInvites'>) {
    setError(null)
    setMessage(null)
    setRevokingId(inviteId)

    try {
      await revokeInvite({ inviteId })
      setMessage('Zaproszenie zostalo cofniete.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Nie udalo sie cofnac zaproszenia.'))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <Card>
      <form noValidate onSubmit={handleCreate}>
        <CardHeader>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Link2 aria-hidden="true" className="h-4 w-4" />
                Zaproszenia
              </div>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Zapros klienta linkiem
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Link laczy nowe albo istniejace konto podopiecznego z Twoim
                panelem. Program aktywujesz osobnym przypisaniem.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/45 px-3 py-2 text-sm">
              <p className="text-xs font-bold text-muted-foreground">
                Oczekujace
              </p>
              <p className="mt-1 font-bold tabular-nums text-foreground">
                {pendingCount}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="grid content-start gap-4">
              <Field label="Email klienta (opcjonalnie)" name="client-invite-email">
                <Input
                  autoComplete="email"
                  disabled={isSubmitting}
                  id="client-invite-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="anna@example.com"
                  type="email"
                  value={email}
                />
              </Field>
              <Field label="Notatka (opcjonalnie)" name="client-invite-note">
                <Textarea
                  disabled={isSubmitting}
                  id="client-invite-note"
                  maxLength={240}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Np. konsultacja startowa, grupa majowa"
                  value={note}
                />
              </Field>
            </div>

            <div className="grid content-start gap-4">
              {createdLink ? (
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-bold text-muted-foreground">
                    Nowy link
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold leading-6 text-foreground">
                    {createdLink}
                  </p>
                  <Button
                    onClick={handleCopy}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {copiedLink ? (
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Clipboard aria-hidden="true" className="h-4 w-4" />
                    )}
                    {copiedLink ? 'Skopiowano' : 'Kopiuj link'}
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/40 p-3">
                  <p className="text-sm font-bold text-foreground">
                    Link pojawi sie po utworzeniu.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Token zapisujemy po stronie Convex jako hash. Surowy link
                    pokazujemy tylko raz.
                  </p>
                </div>
              )}

              <InviteHistory
                invites={invites}
                onRevoke={handleRevoke}
                revokingId={revokingId}
              />
            </div>
          </div>
        </CardBody>

        <CardFooter>
          <div aria-live="polite" className="min-h-5">
            {error ? (
              <StatusMessage tone="error">{error}</StatusMessage>
            ) : message ? (
              <StatusMessage tone="success">{message}</StatusMessage>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">
                Zaproszenie jest jednorazowe i wygasa po 7 dniach.
              </p>
            )}
          </div>
          <Button disabled={isSubmitting} type="submit">
            <Send aria-hidden="true" className="h-4 w-4" />
            {isSubmitting ? 'Tworzenie...' : 'Utworz link'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function InviteHistory({
  invites,
  onRevoke,
  revokingId,
}: {
  invites: CoachInvite[] | undefined
  onRevoke: (inviteId: Id<'clientInvites'>) => void
  revokingId: Id<'clientInvites'> | null
}) {
  if (invites === undefined) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="h-12 rounded-md bg-muted" key={index} />
        ))}
      </div>
    )
  }

  if (invites.length === 0) {
    return (
      <div className="rounded-md border border-border bg-background p-3">
        <p className="text-sm font-semibold text-foreground">
          Brak historii zaproszen.
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Pierwszy link zapisze sie tutaj ze statusem.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      {invites.map((invite) => (
        <div
          className="grid gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          key={invite._id}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <InviteStatusBadge status={invite.effectiveStatus} />
              <span className="text-xs font-semibold text-muted-foreground">
                do {formatDateTime(invite.expiresAt)}
              </span>
            </div>
            <p className="mt-2 truncate text-sm font-bold text-foreground">
              {invite.intendedEmail || invite.note || 'Zaproszenie bez etykiety'}
            </p>
          </div>
          {invite.effectiveStatus === 'pending' ? (
            <Button
              disabled={revokingId === invite._id}
              onClick={() => onRevoke(invite._id)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <XCircle aria-hidden="true" className="h-4 w-4" />
              Cofnij
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function InviteStatusBadge({ status }: { status: CoachInvite['effectiveStatus'] }) {
  const config = {
    accepted: {
      className: 'bg-accent text-accent-foreground',
      icon: CheckCircle2,
      label: 'Przyjete',
    },
    expired: {
      className: 'bg-muted text-muted-foreground',
      icon: RotateCcw,
      label: 'Wygaslo',
    },
    pending: {
      className: 'bg-secondary text-secondary-foreground',
      icon: Link2,
      label: 'Oczekuje',
    },
    revoked: {
      className: 'bg-muted text-foreground',
      icon: XCircle,
      label: 'Cofniete',
    },
  }[status]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 text-xs font-bold ${config.className}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {config.label}
    </span>
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

function StatusMessage({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'error' | 'success'
}) {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2

  return (
    <p
      className={
        tone === 'error'
          ? 'flex items-start gap-2 text-xs font-medium leading-5 text-destructive'
          : 'flex items-start gap-2 text-xs font-medium leading-5 text-accent-foreground'
      }
    >
      <Icon aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(timestamp)
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
