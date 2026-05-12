import { createFileRoute } from '@tanstack/react-router'

import { CoachPage } from '#/app/coach-shell'

export const Route = createFileRoute('/training-results')({
  component: TrainingResultsPage,
})

function TrainingResultsPage() {
  return <CoachPage title="Wyniki treningow" />
}
