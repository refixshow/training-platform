import { createFileRoute } from '@tanstack/react-router'

import { ProgramBuilder } from '#/widgets/program-builder'

export const Route = createFileRoute('/programs')({
  component: ProgramsPage,
})

function ProgramsPage() {
  return <ProgramBuilder />
}
