import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Trash2 } from 'lucide-react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import { Button } from '#/shared/ui/button'

export function UnassignProgramButton({
  assignmentId,
  disabledReason,
  onError,
  onUnassigned,
}: {
  assignmentId: Id<'programAssignments'>
  disabledReason?: string
  onError: (message: string) => void
  onUnassigned: () => void
}) {
  const unassignProgram = useMutation(api.programAssignments.unassign)
  const [isSaving, setIsSaving] = useState(false)

  async function handleUnassign() {
    setIsSaving(true)

    try {
      await unassignProgram({ assignmentId })
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

  return (
    <Button
      aria-label={disabledReason ?? 'Usun przypisanie programu'}
      disabled={Boolean(disabledReason) || isSaving}
      onClick={() => {
        void handleUnassign()
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
