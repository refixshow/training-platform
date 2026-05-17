import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  EditBodyMeasurementModal,
  LogBodyMeasurementModal,
  type MeasurementForEdit,
} from '#/features/log-body-measurement'
import {
  BodyMeasurementHistory,
  type BodyMeasurementEntry,
} from '#/widgets/body-measurement-history'

export const Route = createFileRoute('/measurements')({
  component: MeasurementsPage,
})

type MeasurementRow = NonNullable<FunctionReturnType<typeof api.bodyMeasurements.listForTrainee>>[number]

function MeasurementsPage() {
  const entriesQuery = useQuery(api.bodyMeasurements.listForTrainee)
  const removeMeasurement = useMutation(api.bodyMeasurements.remove)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<MeasurementForEdit | null>(null)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)

  const entries: BodyMeasurementEntry[] = useMemo(() => {
    if (!entriesQuery) return []
    return entriesQuery.map(toEntry)
  }, [entriesQuery])

  const findById = useCallback(
    (entryId: string) => entriesQuery?.find((row) => row._id === entryId) ?? null,
    [entriesQuery],
  )

  const handleEdit = useCallback(
    (entryId: string) => {
      const row = findById(entryId)
      if (!row) return
      setEditingMeasurement(toForEdit(row))
    },
    [findById],
  )

  const handleDelete = useCallback(
    async (entryId: string) => {
      const row = findById(entryId)
      if (!row) return

      const confirmed = window.confirm('Usunac pomiar z dziś? Tej akcji nie da sie cofnac.')
      if (!confirmed) return

      try {
        await removeMeasurement({ measurementId: row._id })
        setFeedback({ tone: 'success', text: 'Pomiar usuniety.' })
      } catch (error) {
        setFeedback({
          tone: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Nie udalo sie usunac pomiaru.',
        })
      }
    },
    [findById, removeMeasurement],
  )

  return (
    <>
      <BodyMeasurementHistory
        entries={entries}
        error={entriesQuery === undefined ? null : (null as Error | null)}
        isLoading={entriesQuery === undefined}
        onAdd={() => setIsCreateOpen(true)}
        onDelete={handleDelete}
        onEdit={handleEdit}
        variant="trainee"
      />

      <LogBodyMeasurementModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSaved={({ photoFailed }) => {
          setFeedback({
            tone: photoFailed ? 'warning' : 'success',
            text: photoFailed
              ? 'Pomiar zapisany, zdjecie sie nie wgralo.'
              : 'Zapisano pomiar.',
          })
        }}
      />

      {editingMeasurement ? (
        <EditBodyMeasurementModal
          isOpen
          measurement={editingMeasurement}
          mode="edit"
          onClose={() => setEditingMeasurement(null)}
          onSaved={({ photoFailed }) => {
            setFeedback({
              tone: photoFailed ? 'warning' : 'success',
              text: photoFailed
                ? 'Pomiar zaktualizowany, zdjecie sie nie wgralo.'
                : 'Zapisano zmiany.',
            })
          }}
        />
      ) : null}

      <MeasurementToast feedback={feedback} onDismiss={() => setFeedback(null)} />
    </>
  )
}

interface FeedbackMessage {
  text: string
  tone: 'success' | 'error' | 'warning'
}

function MeasurementToast({
  feedback,
  onDismiss,
}: {
  feedback: FeedbackMessage | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(onDismiss, 3500)
    return () => window.clearTimeout(timer)
  }, [feedback, onDismiss])

  if (!feedback) return null

  const Icon = feedback.tone === 'error' ? AlertCircle : CheckCircle2

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:justify-end"
    >
      <div
        className={
          feedback.tone === 'error'
            ? 'pointer-events-auto inline-flex max-w-md items-start gap-2 rounded-md border border-destructive bg-card px-4 py-3 text-sm font-semibold text-destructive shadow-lg'
            : feedback.tone === 'warning'
              ? 'pointer-events-auto inline-flex max-w-md items-start gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-lg'
              : 'pointer-events-auto inline-flex max-w-md items-start gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-lg'
        }
      >
        <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{feedback.text}</span>
      </div>
    </div>
  )
}

function toEntry(row: MeasurementRow): BodyMeasurementEntry {
  return {
    _id: row._id,
    capturedAt: row.capturedAt,
    note: row.note ?? undefined,
    photoUrl: row.photoUrl,
    values: pickValues(row),
  }
}

function toForEdit(row: MeasurementRow): MeasurementForEdit {
  return {
    _id: row._id as Id<'bodyMeasurements'>,
    ...pickValues(row),
    note: row.note ?? undefined,
    photoStorageId: row.photoStorageId ?? undefined,
    photoUrl: row.photoUrl,
  }
}

function pickValues(row: MeasurementRow) {
  return {
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
  }
}
