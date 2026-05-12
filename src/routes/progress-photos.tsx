import { createFileRoute } from '@tanstack/react-router'

import { CoachPage } from '#/app/coach-shell'

export const Route = createFileRoute('/progress-photos')({
  component: ProgressPhotosPage,
})

function ProgressPhotosPage() {
  return <CoachPage title="Zdjecia progresu" />
}
