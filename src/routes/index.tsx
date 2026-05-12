import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'

import { TraineeDashboard } from '#/widgets/trainee-dashboard'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  if (import.meta.env.VITE_CONVEX_URL) {
    return <RoleAwareHome />
  }

  return <Navigate search={{ clientId: undefined }} to="/clients" />
}

function RoleAwareHome() {
  const user = useQuery(api.auth.currentUser)

  if (user?.role === 'trainee') {
    return <TraineeDashboard />
  }

  return <Navigate search={{ clientId: undefined }} to="/clients" />
}
