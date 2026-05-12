import { createFileRoute } from '@tanstack/react-router'

import { ProgramAssignment } from '#/widgets/program-assignment'

export const Route = createFileRoute('/assignments')({
  component: AssignmentsPage,
})

function AssignmentsPage() {
  return <ProgramAssignment />
}
