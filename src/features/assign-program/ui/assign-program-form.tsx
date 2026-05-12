import { useMemo, useState } from 'react'
import type { FormikErrors } from 'formik'
import { useFormik } from 'formik'
import { useMutation } from 'convex/react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Save,
  UserRound,
} from 'lucide-react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import {
  emptyProgramAssignmentFormValues,
  programAssignmentFormSchema,
  type ProgramAssignmentFormValues,
} from '#/entities/program'
import { Button } from '#/shared/ui/button'
import { Card, CardBody, CardFooter, CardHeader, CardNotice } from '#/shared/ui/card'
import { Select } from '#/shared/ui/input'

export type AssignmentProgramOption = {
  _id: Id<'programs'>
  description: string
  durationWeeks: number
  routineCount: number
  title: string
}

export type AssignmentTraineeOption = {
  _id: Id<'users'>
  activeAssignmentCount: number
  email?: string
  name?: string
}

export function AssignProgramForm({
  onAssigned,
  onCancel,
  programs,
  trainees,
}: {
  onAssigned: (assignmentId: Id<'programAssignments'>) => void
  onCancel: () => void
  programs: AssignmentProgramOption[]
  trainees: AssignmentTraineeOption[]
}) {
  const assignProgram = useMutation(api.programAssignments.assign)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const programMap = useMemo(
    () => new Map(programs.map((program) => [String(program._id), program])),
    [programs],
  )
  const traineeMap = useMemo(
    () => new Map(trainees.map((trainee) => [String(trainee._id), trainee])),
    [trainees],
  )

  const formik = useFormik<ProgramAssignmentFormValues>({
    initialValues: emptyProgramAssignmentFormValues,
    validate: (values) => validateAssignmentForm(values, programMap, traineeMap),
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null)
      setSubmitSuccess(null)

      try {
        const parsed = programAssignmentFormSchema.parse(values)
        const assignmentId = await assignProgram({
          programId: parsed.programId as Id<'programs'>,
          traineeId: parsed.traineeId as Id<'users'>,
        })

        helpers.resetForm()
        setSubmitSuccess('Program zostal przypisany klientowi.')
        onAssigned(assignmentId)
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Nie udalo sie przypisac programu. Sprobuj ponownie.',
        )
      } finally {
        helpers.setSubmitting(false)
      }
    },
  })

  const selectedProgram = programMap.get(formik.values.programId) ?? null
  const selectedTrainee = traineeMap.get(formik.values.traineeId) ?? null
  const isBlocked = programs.length === 0 || trainees.length === 0
  const validationSummary =
    formik.errors.programId ?? formik.errors.traineeId ?? null

  return (
    <Card>
      <form noValidate onSubmit={formik.handleSubmit}>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
                Nowe przypisanie
              </div>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                Polacz program z klientem
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Przypisanie korzysta z aktualnej biblioteki programu. Decyzja o
                snapshotach pozostaje otwarta dla kolejnego etapu produktu.
              </p>
            </div>

            <Button onClick={onCancel} type="button" variant="secondary">
              Zamknij
            </Button>
          </div>
        </CardHeader>

        {programs.length === 0 ? (
          <CardNotice tone="neutral">
            Najpierw dodaj program z przynajmniej jedna rutyna.
          </CardNotice>
        ) : trainees.length === 0 ? (
          <CardNotice tone="neutral">
            Brakuje klientow przypisanych do tego konta trenera.
          </CardNotice>
        ) : null}

        <CardBody>
          <div className="grid gap-5">
            <Field
              error={formik.touched.programId ? formik.errors.programId : undefined}
              label="Program"
              name="assignment-program"
            >
              <Select
                disabled={formik.isSubmitting || isBlocked}
                id="assignment-program"
                name="programId"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.programId}
              >
                <option value="">Wybierz program</option>
                {programs.map((program) => (
                  <option
                    disabled={program.routineCount === 0}
                    key={program._id}
                    value={program._id}
                  >
                    {program.title} ({program.durationWeeks} tyg.,
                    {program.routineCount} rutyn)
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              error={formik.touched.traineeId ? formik.errors.traineeId : undefined}
              label="Klient"
              name="assignment-trainee"
            >
              <Select
                disabled={formik.isSubmitting || isBlocked}
                id="assignment-trainee"
                name="traineeId"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.traineeId}
              >
                <option value="">Wybierz klienta</option>
                {trainees.map((trainee) => (
                  <option key={trainee._id} value={trainee._id}>
                    {formatTraineeName(trainee)} ({trainee.activeAssignmentCount}
                    {' '}aktywnych)
                  </option>
                ))}
              </Select>
            </Field>

            <AssignmentReview
              program={selectedProgram}
              trainee={selectedTrainee}
            />
          </div>
        </CardBody>

        <CardFooter>
          <div aria-live="polite" className="min-h-5">
            {validationSummary ? (
              <StatusMessage tone="error">{validationSummary}</StatusMessage>
            ) : submitError ? (
              <StatusMessage tone="error">{submitError}</StatusMessage>
            ) : submitSuccess ? (
              <StatusMessage tone="success">{submitSuccess}</StatusMessage>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">
                Convex sprawdzi wlasciciela programu, relacje trenera z klientem
                i duplikaty.
              </p>
            )}
          </div>

          <Button disabled={formik.isSubmitting || isBlocked} type="submit">
            <Save aria-hidden="true" className="h-4 w-4" />
            {formik.isSubmitting ? 'Przypisywanie...' : 'Przypisz program'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function AssignmentReview({
  program,
  trainee,
}: {
  program: AssignmentProgramOption | null
  trainee: AssignmentTraineeOption | null
}) {
  return (
    <div className="rounded-md border border-border bg-muted/45 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserRound aria-hidden="true" className="h-4 w-4 text-primary" />
        Podglad przypisania
      </div>
      {program && trainee ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <ReviewItem label="Program" value={program.title} />
          <ReviewItem label="Klient" value={formatTraineeName(trainee)} />
          <ReviewItem
            label="Zakres"
            value={`${program.durationWeeks} tyg. / ${program.routineCount} rutyn`}
          />
        </dl>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Wybierz program i klienta, zeby zobaczyc krotkie potwierdzenie przed
          zapisem.
        </p>
      )}
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-bold text-foreground">{value}</dd>
    </div>
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

function validateAssignmentForm(
  values: ProgramAssignmentFormValues,
  programMap: Map<string, AssignmentProgramOption>,
  traineeMap: Map<string, AssignmentTraineeOption>,
) {
  const errors: FormikErrors<ProgramAssignmentFormValues> = {}
  const result = programAssignmentFormSchema.safeParse(values)

  if (!result.success) {
    for (const issue of result.error.issues) {
      if (issue.path[0] === 'programId') {
        errors.programId = issue.message
      } else {
        errors.traineeId = issue.message
      }
    }
  }

  const selectedProgram = programMap.get(values.programId)
  if (values.programId && !selectedProgram) {
    errors.programId = 'Ten program nie jest juz dostepny.'
  } else if (selectedProgram && selectedProgram.routineCount === 0) {
    errors.programId = 'Program musi miec przynajmniej jedna rutyne.'
  }

  if (values.traineeId && !traineeMap.has(values.traineeId)) {
    errors.traineeId = 'Ten klient nie jest juz dostepny.'
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

function formatTraineeName(trainee: AssignmentTraineeOption) {
  return trainee.name || trainee.email || 'Klient bez nazwy'
}
