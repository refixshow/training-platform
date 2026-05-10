import { createFileRoute } from '@tanstack/react-router'

import { AppOverview } from '#/widgets/app-overview'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return <AppOverview />
}
