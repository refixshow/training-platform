import { createFileRoute } from '@tanstack/react-router'

import { CoachPage } from '#/app/coach-shell'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return <CoachPage title="Ustawienia" />
}
