import { useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { ArrowLeft } from 'lucide-react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  BodyMeasurementHistory,
  type BodyMeasurementEntry,
} from '#/widgets/body-measurement-history'

export const Route = createFileRoute('/clients/$clientId_/measurements')({
  component: CoachMeasurementsPage,
})

type Payload = NonNullable<FunctionReturnType<typeof api.bodyMeasurements.listForClient>>
type EntryRow = Payload['entries'][number]

function CoachMeasurementsPage() {
  const { clientId } = Route.useParams()
  const traineeId = clientId as Id<'users'>
  const result = useQuery(api.bodyMeasurements.listForClient, { traineeId })

  const entries: BodyMeasurementEntry[] = useMemo(() => {
    if (!result) return []
    return result.entries.map(toEntry)
  }, [result])

  return (
    <section className="grid gap-5">
      <Link
        className="inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
        params={{ clientId: traineeId }}
        search={{ clientId: undefined }}
        to="/clients/$clientId"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Powrot do klienta
      </Link>
      <BodyMeasurementHistory
        entries={entries}
        isLoading={result === undefined}
        traineeName={result?.trainee.name ?? result?.trainee.email ?? 'Klient'}
        variant="coach"
      />
    </section>
  )
}

function toEntry(row: EntryRow): BodyMeasurementEntry {
  return {
    _id: row._id,
    capturedAt: row.capturedAt,
    note: row.note ?? undefined,
    photoUrl: row.photoUrl,
    values: {
      abdomenCm: row.abdomenCm,
      bodyFatPercent: row.bodyFatPercent,
      bodyWeightKg: row.bodyWeightKg,
      chestCm: row.chestCm,
      hipsCm: row.hipsCm,
      leftBicepCm: row.leftBicepCm,
      leftCalfCm: row.leftCalfCm,
      leftForearmCm: row.leftForearmCm,
      leftThighCm: row.leftThighCm,
      neckCm: row.neckCm,
      rightBicepCm: row.rightBicepCm,
      rightCalfCm: row.rightCalfCm,
      rightForearmCm: row.rightForearmCm,
      rightThighCm: row.rightThighCm,
      shoulderCm: row.shoulderCm,
      waistCm: row.waistCm,
    },
  }
}
