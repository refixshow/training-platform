import { createFileRoute } from '@tanstack/react-router'

import { CoachTrainingResultDetail } from '#/widgets/coach-training-result-detail'

export const Route = createFileRoute(
  '/clients/$clientId_/results/$trainingResultId',
)({
  component: ClientTrainingResultDetailPage,
})

function ClientTrainingResultDetailPage() {
  const { clientId, trainingResultId } = Route.useParams()

  return (
    <CoachTrainingResultDetail
      clientId={clientId}
      trainingResultId={trainingResultId}
    />
  )
}
