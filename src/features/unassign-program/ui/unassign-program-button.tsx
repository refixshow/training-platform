import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Trash2 } from 'lucide-react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import { Button } from '#/shared/ui/button'

export function UnassignProgramButton({
  assignmentLabel,
  assignmentId,
  disabledReason,
  onError,
  onUnassigned,
}: {
  assignmentLabel: string
  assignmentId: Id<'programAssignments'>
  disabledReason?: string
  onError: (message: string) => void
  onUnassigned: () => void
}) {
  const unassignProgram = useMutation(api.programAssignments.unassign)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleUnassign() {
    setIsSaving(true)

    try {
      await unassignProgram({ assignmentId })
      setIsConfirming(false)
      onUnassigned()
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Nie udalo sie usunac przypisania. Sprobuj ponownie.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isConfirming) {
    return (
      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
        <Button
          aria-label={`Potwierdz usuniecie przypisania: ${assignmentLabel}`}
          disabled={isSaving}
          onClick={() => {
            void handleUnassign()
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          {isSaving ? 'Usuwanie...' : 'Potwierdz'}
        </Button>
        <Button
          aria-label={`Anuluj usuwanie przypisania: ${assignmentLabel}`}
          disabled={isSaving}
          onClick={() => setIsConfirming(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Anuluj
        </Button>
      </div>
    )
  }

  return (
    <Button
      aria-label={
        disabledReason ?? `Usun przypisanie programu: ${assignmentLabel}`
      }
      disabled={Boolean(disabledReason) || isSaving}
      onClick={() => {
        setIsConfirming(true)
      }}
      size="sm"
      type="button"
      variant="ghost"
    >
      <Trash2 aria-hidden="true" className="h-4 w-4" />
      {isSaving ? 'Usuwanie...' : 'Usun'}
    </Button>
  )
}
