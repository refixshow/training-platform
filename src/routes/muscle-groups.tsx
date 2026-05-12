import { createFileRoute } from '@tanstack/react-router'

import { MuscleGroupAdmin } from '#/widgets/muscle-group-admin'

export const Route = createFileRoute('/muscle-groups')({
  component: MuscleGroupsPage,
})

function MuscleGroupsPage() {
  return <MuscleGroupAdmin />
}
