import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth, getAuthUserId } from '@convex-dev/auth/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { query } from './_generated/server'

type AuthCtx = Pick<MutationCtx | QueryCtx, 'auth' | 'db'>

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? '').trim().toLowerCase()
        const name = String(params.name ?? '').trim()

        return {
          email,
          name: name || email,
          role: 'trainee',
        }
      },
      validatePasswordRequirements(password) {
        if (password.length < 8) {
          throw new Error('Haslo musi miec przynajmniej 8 znakow.')
        }
      },
    }),
  ],
})

export const currentCoachAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return null
    }

    const user = await ctx.db.get(userId)

    if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
      return null
    }

    return user
  },
})

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return null
    }

    return await ctx.db.get(userId)
  },
})

export async function requireCoachAdmin(ctx: AuthCtx) {
  const userId = await getAuthUserId(ctx)

  if (!userId) {
    throw new Error('You must be signed in as a coach to manage the library.')
  }

  const user = await ctx.db.get(userId)

  if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
    throw new Error('You do not have access to manage the library.')
  }

  return user
}

export async function requireTrainee(ctx: AuthCtx) {
  const userId = await getAuthUserId(ctx)

  if (!userId) {
    throw new Error('You must be signed in as a trainee to view assignments.')
  }

  const user = await ctx.db.get(userId)

  if (!user || user.role !== 'trainee') {
    throw new Error('You do not have access to trainee assignments.')
  }

  return user
}
