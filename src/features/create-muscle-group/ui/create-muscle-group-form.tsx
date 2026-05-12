import { useState } from 'react'
import type { FormikErrors } from 'formik'
import { useFormik } from 'formik'
import { AlertCircle, CheckCircle2, Layers3, Save } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

import {
  emptyMuscleGroupFormValues,
  muscleGroupFormSchema,
  type MuscleGroupFormValues,
} from '#/entities/muscle-group'
import { Button } from '#/shared/ui/button'
import {
  CardBody,
  CardFooter,
  CardForm,
  CardHeader,
} from '#/shared/ui/card'
import { Input } from '#/shared/ui/input'

interface CreateMuscleGroupFormProps {
  onCreated?: () => void
}

export function CreateMuscleGroupForm({
  onCreated,
}: CreateMuscleGroupFormProps) {
  const createMuscleGroup = useMutation(api.muscleGroups.create)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const formik = useFormik<MuscleGroupFormValues>({
    initialValues: emptyMuscleGroupFormValues,
    validate: validateMuscleGroupForm,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null)
      setSubmitSuccess(null)

      const parsed = muscleGroupFormSchema.parse(values)

      try {
        await createMuscleGroup({ name: parsed.name })

        helpers.resetForm()
        setSubmitSuccess('Grupa miesniowa jest dostepna w formularzu cwiczen.')
        onCreated?.()
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Nie udalo sie zapisac grupy. Sprobuj ponownie.',
        )
      } finally {
        helpers.setSubmitting(false)
      }
    },
  })

  return (
    <CardForm noValidate onSubmit={formik.handleSubmit}>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Layers3 aria-hidden="true" className="h-4 w-4" />
          Nowa grupa
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Klasyfikacja do biblioteki cwiczen
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Nazwa powinna byc krotka i jednoznaczna, np. Klatka piersiowa, Plecy
          albo Dwuglowe uda.
        </p>
      </CardHeader>

      <CardBody>
        <Field label="Nazwa grupy" name="name" error={formik.errors.name}>
          <Input
            aria-describedby={
              formik.errors.name ? 'muscle-group-name-error' : undefined
            }
            disabled={formik.isSubmitting}
            id="name"
            name="name"
            onBlur={formik.handleBlur}
            onChange={formik.handleChange}
            placeholder="Np. Plecy"
            value={formik.values.name}
          />
        </Field>
      </CardBody>

      <CardFooter>
        <div aria-live="polite" className="min-h-6">
          {submitError ? (
            <StatusMessage tone="error">{submitError}</StatusMessage>
          ) : null}
          {submitSuccess ? (
            <StatusMessage tone="success">{submitSuccess}</StatusMessage>
          ) : null}
        </div>

        <Button disabled={formik.isSubmitting} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {formik.isSubmitting ? 'Zapisywanie...' : 'Dodaj grupe'}
        </Button>
      </CardFooter>
    </CardForm>
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

function Field({
  children,
  error,
  label,
  name,
}: {
  children: React.ReactNode
  error?: string
  label: string
  name: keyof MuscleGroupFormValues
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      {children}
      <p className="text-xs leading-5 text-muted-foreground">
        Maksymalnie 80 znakow. Duplikaty sa sprawdzane bez wzgledu na wielkosc
        liter.
      </p>
      <FieldError error={error} id={`muscle-group-${name}-error`} />
    </div>
  )
}

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) {
    return null
  }

  return (
    <p
      className="flex items-start gap-2 text-xs font-medium leading-5 text-destructive"
      id={id}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{error}</span>
    </p>
  )
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
          ? 'flex items-start gap-2 text-sm font-medium text-destructive'
          : 'flex items-start gap-2 text-sm font-medium text-accent-foreground'
      }
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
