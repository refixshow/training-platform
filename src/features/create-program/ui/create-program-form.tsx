import { useMemo, useState } from 'react'
import type { FormikErrors } from 'formik'
import { useFormik } from 'formik'
import { useMutation } from 'convex/react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import {
  emptyProgramFormValues,
  parseProgramDuration,
  programFormSchema,
  type ProgramFormValues,
} from '#/entities/program'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardHeader, CardNotice } from '#/shared/ui/card'
import { Input, Textarea } from '#/shared/ui/input'

export type ProgramRoutineOption = Doc<'routines'> & {
  exerciseCount: number
  setCount: number
}

export function CreateProgramForm({
  onCancel,
  onCreated,
  routines,
}: {
  onCancel: () => void
  onCreated: (programId: Id<'programs'>) => void
  routines: ProgramRoutineOption[]
}) {
  const createProgram = useMutation(api.programs.create)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const routineMap = useMemo(
    () => new Map(routines.map((routine) => [String(routine._id), routine])),
    [routines],
  )

  const formik = useFormik<ProgramFormValues>({
    initialValues: emptyProgramFormValues,
    validate: (values) => validateProgramForm(values, routineMap),
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null)
      setSubmitSuccess(null)

      try {
        const parsed = programFormSchema.parse(values)
        const programId = await createProgram({
          description: parsed.description,
          durationWeeks: parseProgramDuration(parsed.durationWeeks),
          placements: parsed.routineIds.map((routineId, index) => ({
            order: index + 1,
            routineId: routineId as Id<'routines'>,
          })),
          title: parsed.title,
        })

        setSubmitSuccess('Program zostal zapisany.')
        onCreated(programId)
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Nie udalo sie zapisac programu. Sprobuj ponownie.',
        )
      } finally {
        helpers.setSubmitting(false)
      }
    },
  })

  const selectedRoutines = formik.values.routineIds
    .map((routineId) => routineMap.get(routineId))
    .filter((routine): routine is ProgramRoutineOption => Boolean(routine))
  const selectedSetCount = selectedRoutines.reduce(
    (total, routine) => total + routine.setCount,
    0,
  )
  const validationSummary =
    formik.errors.title ??
    formik.errors.durationWeeks ??
    formik.errors.routineIds?.toString()

  function toggleRoutine(routineId: string) {
    const routineIds = formik.values.routineIds.includes(routineId)
      ? formik.values.routineIds.filter((id) => id !== routineId)
      : [...formik.values.routineIds, routineId]

    void formik.setFieldValue('routineIds', routineIds)
  }

  function moveRoutine(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= formik.values.routineIds.length) {
      return
    }

    const routineIds = [...formik.values.routineIds]
    const current = routineIds[index]
    const target = routineIds[targetIndex]
    if (!current || !target) {
      return
    }

    routineIds[index] = target
    routineIds[targetIndex] = current
    void formik.setFieldValue('routineIds', routineIds)
  }

  return (
    <form className="grid gap-5" noValidate onSubmit={formik.handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ClipboardList aria-hidden="true" className="h-4 w-4" />
                Nowy program
              </div>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Zbior rutyn dla klienta
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Program przechowuje rutyny, z ktorych klient sam wybierze
                trening do wykonania. Zapis wymaga minimum jednej rutyny.
              </p>
            </div>

            <Button onClick={onCancel} type="button" variant="secondary">
              Zamknij
            </Button>
          </div>
        </CardHeader>

        <CardBody>
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
              <Field
                error={formik.touched.title ? formik.errors.title : undefined}
                label="Nazwa programu"
                name="program-title"
              >
                <Input
                  disabled={formik.isSubmitting}
                  id="program-title"
                  name="title"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  placeholder="Np. Sila bazowa 4 tygodnie"
                  value={formik.values.title}
                />
              </Field>

              <Field
                error={
                  formik.touched.durationWeeks
                    ? formik.errors.durationWeeks
                    : undefined
                }
                label="Czas (tyg.)"
                name="program-duration"
              >
                <Input
                  disabled={formik.isSubmitting}
                  id="program-duration"
                  min={1}
                  max={52}
                  name="durationWeeks"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type="number"
                  value={formik.values.durationWeeks}
                />
              </Field>
            </div>

            <Field
              error={
                formik.touched.description
                  ? formik.errors.description
                  : undefined
              }
              label="Opis dla trenera"
              name="program-description"
            >
              <Textarea
                disabled={formik.isSubmitting}
                id="program-description"
                name="description"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                placeholder="Cel programu, kontekst klienta, wskazowki do wyboru rutyn."
                value={formik.values.description}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Plus aria-hidden="true" className="h-4 w-4 text-primary" />
              Wybierz rutyny
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Kolejnosc wyboru tworzy liste w programie. Klient zobaczy zestaw
              rutyn i wybierze trening, ktory chce wykonac.
            </p>
          </CardHeader>

          <div className="grid gap-0">
            {routines.map((routine) => {
              const checked = formik.values.routineIds.includes(routine._id)

              return (
                <label
                  className={
                    checked
                      ? 'grid cursor-pointer gap-3 border-b border-border bg-accent/70 p-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)]'
                      : 'grid cursor-pointer gap-3 border-b border-border p-4 transition-colors hover:bg-muted/65 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)]'
                  }
                  key={routine._id}
                >
                  <input
                    checked={checked}
                    className="mt-1 h-4 w-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    disabled={formik.isSubmitting}
                    onChange={() => toggleRoutine(routine._id)}
                    type="checkbox"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">
                      {routine.name}
                    </span>
                    <span className="mt-2 grid gap-2 text-xs font-semibold text-muted-foreground sm:grid-cols-3">
                      <span>{routine.exerciseCount} cwiczen</span>
                      <span>{routine.setCount} serii</span>
                      <span>
                        {routine.updatedAt || routine.createdAt
                          ? 'Aktualna'
                          : 'Bez daty'}
                      </span>
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-foreground">
              Kolejnosc w programie
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              To nie jest kalendarz. To uporzadkowana lista dostepnych rutyn.
            </p>
          </CardHeader>

          {selectedRoutines.length === 0 ? (
            <CardNotice tone="neutral">
              Wybierz minimum jedna rutyne, zeby zapisac program.
            </CardNotice>
          ) : (
            <div className="grid gap-0">
              {selectedRoutines.map((routine, index) => (
                <div
                  className="grid gap-3 border-b border-border p-4 last:border-b-0"
                  key={routine._id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary">
                        #{index + 1}
                      </p>
                      <h3 className="mt-1 text-sm font-bold text-foreground">
                        {routine.name}
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        disabled={formik.isSubmitting || index === 0}
                        onClick={() => moveRoutine(index, -1)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowUp aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only">Przesun wyzej</span>
                      </Button>
                      <Button
                        disabled={
                          formik.isSubmitting ||
                          index === selectedRoutines.length - 1
                        }
                        onClick={() => moveRoutine(index, 1)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowDown aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only">Przesun nizej</span>
                      </Button>
                      <Button
                        disabled={formik.isSubmitting}
                        onClick={() => toggleRoutine(routine._id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only">Usun z programu</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="sticky bottom-4 z-10 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-1">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-foreground">
                {formik.values.routineIds.length} rutyn
              </span>
              <span className="font-semibold text-foreground">
                {selectedSetCount} serii lacznie
              </span>
              <span className="font-semibold text-foreground">
                {formik.values.durationWeeks || 0} tyg.
              </span>
            </div>
            <div aria-live="polite" className="min-h-5">
              {validationSummary ? (
                <StatusMessage tone="error">{validationSummary}</StatusMessage>
              ) : submitError ? (
                <StatusMessage tone="error">{submitError}</StatusMessage>
              ) : submitSuccess ? (
                <StatusMessage tone="success">{submitSuccess}</StatusMessage>
              ) : (
                <p className="text-xs font-medium text-muted-foreground">
                  Zapis sprawdzi program i rutyny po stronie Convex.
                </p>
              )}
            </div>
          </div>

          <Button disabled={formik.isSubmitting} type="submit">
            <Save aria-hidden="true" className="h-4 w-4" />
            {formik.isSubmitting ? 'Zapisywanie...' : 'Zapisz program'}
          </Button>
        </div>
      </div>
    </form>
  )
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
  name: string
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      {children}
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    </div>
  )
}

function validateProgramForm(
  values: ProgramFormValues,
  routineMap: Map<string, ProgramRoutineOption>,
) {
  const errors: FormikErrors<ProgramFormValues> = {}
  const result = programFormSchema.safeParse(values)

  if (!result.success) {
    for (const issue of result.error.issues) {
      if (issue.path[0] === 'title') {
        errors.title = issue.message
      } else if (issue.path[0] === 'description') {
        errors.description = issue.message
      } else if (issue.path[0] === 'durationWeeks') {
        errors.durationWeeks = issue.message
      } else {
        errors.routineIds = issue.message
      }
    }
  }

  if (values.routineIds.some((routineId) => !routineMap.has(routineId))) {
    errors.routineIds =
      'Jedna z wybranych rutyn jest niedostepna. Usun ja z programu.'
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
