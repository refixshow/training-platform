import { useState } from 'react'
import type { FormikErrors } from 'formik'
import { useFormik } from 'formik'
import { AlertCircle, CheckCircle2, Save, X } from 'lucide-react'
import { useMutation } from 'convex/react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import {
  muscleGroupFormSchema,
  type MuscleGroupFormValues,
} from '#/entities/muscle-group'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'

interface EditMuscleGroupFormProps {
  initialName: string
  muscleGroupId: Id<'muscleGroups'>
  onCancel: () => void
  onSaved?: () => void
}

export function EditMuscleGroupForm({
  initialName,
  muscleGroupId,
  onCancel,
  onSaved,
}: EditMuscleGroupFormProps) {
  const updateMuscleGroup = useMutation(api.muscleGroups.update)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const formik = useFormik<MuscleGroupFormValues>({
    initialValues: { name: initialName },
    validate: validateMuscleGroupForm,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null)
      setSubmitSuccess(null)

      const parsed = muscleGroupFormSchema.parse(values)

      try {
        await updateMuscleGroup({
          muscleGroupId,
          name: parsed.name,
        })

        setSubmitSuccess('Nazwa grupy zostala zapisana.')
        onSaved?.()
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Nie udalo sie zapisac zmiany. Sprobuj ponownie.',
        )
      } finally {
        helpers.setSubmitting(false)
      }
    },
  })

  return (
    <form
      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      noValidate
      onSubmit={formik.handleSubmit}
    >
      <label className="grid gap-1">
        <span className="sr-only">Nazwa grupy miesniowej</span>
        <Input
          aria-describedby={
            formik.errors.name ? `${muscleGroupId}-edit-error` : undefined
          }
          autoFocus
          disabled={formik.isSubmitting}
          id={`${muscleGroupId}-edit-name`}
          name="name"
          onBlur={formik.handleBlur}
          onChange={formik.handleChange}
          value={formik.values.name}
        />
      </label>

      <Button disabled={formik.isSubmitting} size="sm" type="submit">
        <Save aria-hidden="true" className="h-4 w-4" />
        {formik.isSubmitting ? 'Zapis...' : 'Zapisz'}
      </Button>

      <Button
        disabled={formik.isSubmitting}
        onClick={onCancel}
        size="sm"
        type="button"
        variant="secondary"
      >
        <X aria-hidden="true" className="h-4 w-4" />
        Anuluj
      </Button>

      <div
        aria-live="polite"
        className="min-h-5 sm:col-span-3"
        id={`${muscleGroupId}-edit-error`}
      >
        {formik.errors.name ? (
          <StatusMessage tone="error">{formik.errors.name}</StatusMessage>
        ) : null}
        {submitError ? (
          <StatusMessage tone="error">{submitError}</StatusMessage>
        ) : null}
        {submitSuccess ? (
          <StatusMessage tone="success">{submitSuccess}</StatusMessage>
        ) : null}
      </div>
    </form>
  )
}

function validateMuscleGroupForm(values: MuscleGroupFormValues) {
  const result = muscleGroupFormSchema.safeParse(values)
  const errors: FormikErrors<MuscleGroupFormValues> = {}

  if (result.success) {
    return errors
  }

  for (const issue of result.error.issues) {
    const key = issue.path[0]

    if (typeof key === 'string') {
      errors[key as keyof MuscleGroupFormValues] = issue.message
    }
  }

  return errors
}

function StatusMessage({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'error' | 'success'
}) {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2

  return (
    <p
      className={
        tone === 'error'
          ? 'flex items-start gap-2 text-xs font-medium leading-5 text-destructive'
          : 'flex items-start gap-2 text-xs font-medium leading-5 text-accent-foreground'
      }
    >
      <Icon aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
