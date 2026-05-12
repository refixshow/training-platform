import { createFileRoute } from '@tanstack/react-router'

import { CoachClientDetail } from '#/widgets/coach-client-list'

export const Route = createFileRoute('/clients/$clientId')({
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const { clientId } = Route.useParams()

  return <CoachClientDetail clientId={clientId} />
}
