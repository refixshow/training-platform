import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import type { Doc } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireCoachAdmin } from './auth'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_INVITES = 50
const MAX_NOTE_LENGTH = 240

type InviteCtx = Pick<QueryCtx | MutationCtx, 'auth' | 'db'>

export const createInvite = mutation({
  args: {
    intendedEmail: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const token = createInviteToken()
    const now = Date.now()

    const inviteId = await ctx.db.insert('clientInvites', {
      coachId: coach._id,
      createdAt: now,
      expiresAt: now + INVITE_TTL_MS,
      intendedEmail: sanitizeEmail(args.intendedEmail),
      note: sanitizeNote(args.note),
      status: 'pending',
      tokenHash: await hashToken(token),
    })

    return {
      expiresAt: now + INVITE_TTL_MS,
      inviteId,
      token,
    }
  },
})

export const listInvitesByCoach = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const invites = await ctx.db
      .query('clientInvites')
      .withIndex('by_coach', (q) => q.eq('coachId', coach._id))
      .order('desc')
      .take(clampLimit(args.limit, MAX_INVITES))

    return invites.map(toCoachInviteRow)
  },
})

export const revokeInvite = mutation({
  args: {
    inviteId: v.id('clientInvites'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const invite = await ctx.db.get(args.inviteId)

    if (!invite || invite.coachId !== coach._id) {
      throw new Error('Nie znaleziono zaproszenia w Twoim panelu.')
    }

    if (invite.status !== 'pending') {
      throw new Error('Tylko oczekujace zaproszenie mozna cofnac.')
    }

    await ctx.db.patch(invite._id, {
      revokedAt: Date.now(),
      status: 'revoked',
    })

    return invite._id
  },
})

export const getInvitePreview = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getAuthUserId(ctx)
    const invite = await getInviteByToken(ctx, args.token)

    if (!invite) {
      return {
        status: 'invalid' as const,
      }
    }

    const effectiveStatus = getEffectiveStatus(invite)

    if (effectiveStatus !== 'pending') {
      if (effectiveStatus === 'accepted' && invite.acceptedUserId === viewerUserId) {
        return {
          expiresAt: invite.expiresAt,
          intendedEmail: invite.intendedEmail,
          status: 'already_connected' as const,
        }
      }

      return {
        expiresAt: invite.expiresAt,
        intendedEmail: invite.intendedEmail,
        status: effectiveStatus,
      }
    }

    const coach = await ctx.db.get(invite.coachId)

    return {
      coach: coach
        ? {
            name: coach.name,
          }
        : null,
      expiresAt: invite.expiresAt,
      intendedEmail: invite.intendedEmail,
      status: effectiveStatus,
    }
  },
})

export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      throw new Error('Zaloguj sie albo utworz konto, zeby przyjac zaproszenie.')
    }

    const [invite, user] = await Promise.all([
      getInviteByToken(ctx, args.token),
      ctx.db.get(userId),
    ])

    if (!invite) {
      throw new Error('Ten link zaproszenia jest nieprawidlowy.')
    }

    const effectiveStatus = getEffectiveStatus(invite)

    if (effectiveStatus === 'expired') {
      throw new Error('Ten link zaproszenia wygasl. Popros trenera o nowy link.')
    }

    if (effectiveStatus === 'revoked') {
      throw new Error('To zaproszenie zostalo cofniete.')
    }

    if (effectiveStatus === 'accepted') {
      if (invite.acceptedUserId === userId) {
        return {
          coachId: invite.coachId,
          status: 'already_connected' as const,
        }
      }

      throw new Error('To zaproszenie zostalo juz wykorzystane.')
    }

    if (!user || user.role !== 'trainee') {
      throw new Error('Zaproszenie klienta moze przyjac tylko konto podopiecznego.')
    }

    if (user.coachId && user.coachId !== invite.coachId) {
      throw new Error(
        'To konto jest juz przypisane do innego trenera. Transfer wymaga osobnego flow.',
      )
    }

    const now = Date.now()

    if (!user.coachId) {
      await ctx.db.patch(user._id, {
        coachId: invite.coachId,
      })
    }

    await ctx.db.patch(invite._id, {
      acceptedAt: now,
      acceptedUserId: user._id,
      status: 'accepted',
    })

    return {
      coachId: invite.coachId,
      status: 'connected' as const,
    }
  },
})

async function getInviteByToken(ctx: InviteCtx, token: string) {
  const normalizedToken = token.trim()

  if (!normalizedToken) {
    return null
  }

  const tokenHash = await hashToken(normalizedToken)

  return await ctx.db
    .query('clientInvites')
    .withIndex('by_token_hash', (q) => q.eq('tokenHash', tokenHash))
    .unique()
}

function getEffectiveStatus(invite: Doc<'clientInvites'>) {
  if (invite.status === 'pending' && invite.expiresAt <= Date.now()) {
    return 'expired' as const
  }

  return invite.status
}

function toCoachInviteRow(invite: Doc<'clientInvites'>) {
  return {
    _id: invite._id,
    acceptedAt: invite.acceptedAt,
    createdAt: invite.createdAt,
    effectiveStatus: getEffectiveStatus(invite),
    expiresAt: invite.expiresAt,
    intendedEmail: invite.intendedEmail,
    note: invite.note,
    revokedAt: invite.revokedAt,
    status: invite.status,
  }
}

function createInviteToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return base64UrlEncode(bytes)
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )

  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function sanitizeEmail(value?: string) {
  const email = value?.trim().toLowerCase()

  return email || undefined
}

function sanitizeNote(value?: string) {
  const note = value?.trim()

  if (!note) {
    return undefined
  }

  if (note.length > MAX_NOTE_LENGTH) {
    throw new Error(`Notatka moze miec maksymalnie ${MAX_NOTE_LENGTH} znakow.`)
  }

  return note
}

function clampLimit(value: number | undefined, max: number) {
  return Math.min(Math.max(value ?? max, 1), max)
}
