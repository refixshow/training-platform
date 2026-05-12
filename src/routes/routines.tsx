import { createFileRoute } from '@tanstack/react-router'

import { RoutineBuilder } from '#/widgets/routine-builder'

export const Route = createFileRoute('/routines')({
  component: RoutinesPage,
})

function RoutinesPage() {
  return <RoutineBuilder />
}
