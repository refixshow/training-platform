import { createFileRoute } from '@tanstack/react-router'

import { TraineeDashboard } from '#/widgets/trainee-dashboard'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return <TraineeDashboard />
}
