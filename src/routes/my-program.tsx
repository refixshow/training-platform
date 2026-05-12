import { createFileRoute } from '@tanstack/react-router'

import { TraineeProgramView } from '#/widgets/trainee-program-view'

export const Route = createFileRoute('/my-program')({
  component: MyProgramPage,
})

function MyProgramPage() {
  return <TraineeProgramView />
}
