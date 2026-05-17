import { createFileRoute } from '@tanstack/react-router'

import {
  parseReviewListSearch,
  type ReviewListSearchParams,
} from '#/features/review-training-result'
import { CoachTrainingResultList } from '#/widgets/coach-training-result-list'

export const Route = createFileRoute('/clients/$clientId_/results/')({
  component: ClientTrainingResultsPage,
  validateSearch: (search): ReviewListSearchParams =>
    parseReviewListSearch(search as Record<string, unknown>),
})

function ClientTrainingResultsPage() {
  const { clientId } = Route.useParams()
  const { programId, range } = Route.useSearch()

  return (
    <CoachTrainingResultList
      clientId={clientId}
      programId={programId}
      range={range}
    />
  )
}
