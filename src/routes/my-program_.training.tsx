import { createFileRoute } from '@tanstack/react-router'

import { WorkoutLogging } from '#/widgets/workout-logging'

export const Route = createFileRoute('/my-program_/training')({
  component: TrainingLoggingPage,
  validateSearch: (search) => ({
    assignmentId:
      typeof search.assignmentId === 'string' ? search.assignmentId : undefined,
    routineId: typeof search.routineId === 'string' ? search.routineId : undefined,
  }),
})

function TrainingLoggingPage() {
  const search = Route.useSearch()

  return (
    <WorkoutLogging
      assignmentId={search.assignmentId}
      routineId={search.routineId}
    />
  )
}
