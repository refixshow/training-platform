import { createFileRoute } from '@tanstack/react-router'

import { AcceptClientInvite } from '#/features/accept-client-invite'

export const Route = createFileRoute('/invite/$token')({
  component: InviteAcceptPage,
})

function InviteAcceptPage() {
  const { token } = Route.useParams()

  return <AcceptClientInvite token={token} />
}
