import { createFileRoute } from '@tanstack/react-router'

import { CoachPage } from '#/app/coach-shell'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  return <CoachPage title="Analityka" />
}
