import { Navigate, createFileRoute } from '@tanstack/react-router'

import { CoachClientList } from '#/widgets/coach-client-list'

export const Route = createFileRoute('/clients/')({
  component: ClientsPage,
  validateSearch: (search) => ({
    clientId: typeof search.clientId === 'string' ? search.clientId : undefined,
  }),
})

function ClientsPage() {
  const search = Route.useSearch()

  if (search.clientId) {
    return (
      <Navigate
        params={{ clientId: search.clientId }}
        search={{ clientId: undefined }}
        to="/clients/$clientId"
      />
    )
  }

  return <CoachClientList />
}
