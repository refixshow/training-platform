import { useState } from 'react'
import type { FormikErrors } from 'formik'
import { useFormik } from 'formik'
import { AlertCircle, CheckCircle2, ListPlus, Save } from 'lucide-react'
import { useMutation } from 'convex/react'
import type { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'

import {
  emptyExerciseFormValues,
  exerciseEquipmentOptions,
  exerciseFormSchema,
  exerciseTypeOptions,
  splitInstructionText,
  type ExerciseFormValues,
} from '#/entities/exercise'
import type { MuscleGroupOption } from '#/entities/muscle-group'
import { Button } from '#/shared/ui/button'
import {
  CardBody,
  CardFooter,
  CardForm,
  CardHeader,
  CardNotice,
} from '#/shared/ui/card'
import { Input, Select, Textarea } from '#/shared/ui/input'

interface CreateExerciseFormProps {
  muscleGroups: MuscleGroupOption[]
  onCreated?: () => void
}

export function CreateExerciseForm({
  muscleGroups,
  onCreated,
}: CreateExerciseFormProps) {
  const createExercise = useMutation(api.exercises.create)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const formik = useFormik<ExerciseFormValues>({
    initialValues: emptyExerciseFormValues,
    validate: validateExerciseForm,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null)
      setSubmitSuccess(null)

      const parsed = exerciseFormSchema.parse(values)

      try {
        await createExercise({
          customEquipment: parsed.customEquipment?.trim() || undefined,
          equipment: parsed.equipment,
          instructions: splitInstructionText(parsed.instructionText),
          name: parsed.name,
          primaryMuscleGroupId:
            parsed.primaryMuscleGroupId as Id<'muscleGroups'>,
          secondaryMuscleGroupIds:
            parsed.secondaryMuscleGroupIds as Id<'muscleGroups'>[],
          type: parsed.type,
          videoUrl: parsed.videoUrl?.trim() || undefined,
        })

        helpers.resetForm()
        setSubmitSuccess('Cwiczenie zostalo dodane do biblioteki.')
        onCreated?.()
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Nie udalo sie zapisac cwiczenia. Sprobuj ponownie.',
        )
      } finally {
        helpers.setSubmitting(false)
      }
    },
  })

  const selectedPrimary = formik.values.primaryMuscleGroupId
  const canSubmit = muscleGroups.length > 0 && !formik.isSubmitting

  return (
    <CardForm
      noValidate
      onSubmit={formik.handleSubmit}
    >
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ListPlus aria-hidden="true" className="h-4 w-4" />
          Nowe cwiczenie
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Dane do rutyn i wynikow
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Wypelnij tylko pola wymagane. Media i instrukcje mozna uzupelnic
          pozniej, kiedy biblioteka zacznie obslugiwac edycje.
        </p>
      </CardHeader>

      {muscleGroups.length === 0 ? (
        <CardNotice>
          Najpierw dodaj grupy miesniowe. Bez nich cwiczenie nie ma glownej
          klasyfikacji.
        </CardNotice>
      ) : null}

      <CardBody>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-5">
          <section className="grid gap-4" aria-labelledby="exercise-basics">
            <h3
              className="text-sm font-bold text-foreground"
              id="exercise-basics"
            >
              Podstawy
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nazwa" name="name" error={formik.errors.name}>
                <Input
                  aria-describedby={
                    formik.errors.name ? 'exercise-name-error' : undefined
                  }
                  disabled={formik.isSubmitting}
                  id="name"
                  name="name"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  placeholder="Np. Goblet squat"
                  value={formik.values.name}
                />
              </Field>

              <Field label="Typ cwiczenia" name="type" error={formik.errors.type}>
                <Select
                  disabled={formik.isSubmitting}
                  id="type"
                  name="type"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  value={formik.values.type}
                >
                  {exerciseTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Sprzet"
                name="equipment"
                error={formik.errors.equipment}
              >
                <Select
                  disabled={formik.isSubmitting}
                  id="equipment"
                  name="equipment"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  value={formik.values.equipment}
                >
                  {exerciseEquipmentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {formik.values.equipment === 'other' ? (
                <Field
                  label="Nazwa sprzetu"
                  name="customEquipment"
                  error={formik.errors.customEquipment}
                >
                  <Input
                    disabled={formik.isSubmitting}
                    id="customEquipment"
                    name="customEquipment"
                    onBlur={formik.handleBlur}
                    onChange={formik.handleChange}
                    placeholder="Np. sled, landmine"
                    value={formik.values.customEquipment}
                  />
                </Field>
              ) : null}
            </div>
          </section>

          <section
            className="grid gap-4 border-t border-border pt-5"
            aria-labelledby="exercise-classification"
          >
            <h3
              className="text-sm font-bold text-foreground"
              id="exercise-classification"
            >
              Klasyfikacja
            </h3>

            <Field
              label="Glowna grupa miesniowa"
              name="primaryMuscleGroupId"
              error={formik.errors.primaryMuscleGroupId}
            >
              <Select
                disabled={formik.isSubmitting || muscleGroups.length === 0}
                id="primaryMuscleGroupId"
                name="primaryMuscleGroupId"
                onBlur={formik.handleBlur}
                onChange={(event) => {
                  const nextPrimary = event.target.value
                  void formik.setFieldValue('primaryMuscleGroupId', nextPrimary)
                  void formik.setFieldValue(
                    'secondaryMuscleGroupIds',
                    formik.values.secondaryMuscleGroupIds.filter(
                      (id) => id !== nextPrimary,
                    ),
                  )
                }}
                value={formik.values.primaryMuscleGroupId}
              >
                <option value="">Wybierz grupe</option>
                {muscleGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">
                Dodatkowe grupy miesniowe
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {muscleGroups.map((group) => {
                  const isPrimary = selectedPrimary === group.id
                  const checked = formik.values.secondaryMuscleGroupIds.includes(
                    group.id,
                  )

                  return (
                    <label
                      className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55"
                      key={group.id}
                    >
                      <input
                        checked={checked}
                        className="h-4 w-4 accent-primary"
                        disabled={formik.isSubmitting || isPrimary}
                        name="secondaryMuscleGroupIds"
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [
                                ...formik.values.secondaryMuscleGroupIds,
                                group.id,
                              ]
                            : formik.values.secondaryMuscleGroupIds.filter(
                                (id) => id !== group.id,
                              )

                          void formik.setFieldValue(
                            'secondaryMuscleGroupIds',
                            next,
                          )
                        }}
                        type="checkbox"
                      />
                      <span>{group.name}</span>
                      {isPrimary ? (
                        <span className="ml-auto text-xs font-semibold text-muted-foreground">
                          glowna
                        </span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
              <FieldError
                error={
                  typeof formik.errors.secondaryMuscleGroupIds === 'string'
                    ? formik.errors.secondaryMuscleGroupIds
                    : undefined
                }
                id="secondaryMuscleGroupIds-error"
              />
            </div>
          </section>

          <section
            className="grid gap-4 border-t border-border pt-5"
            aria-labelledby="exercise-media"
          >
            <h3
              className="text-sm font-bold text-foreground"
              id="exercise-media"
            >
              Media i instrukcje
            </h3>

            <Field
              label="Link wideo"
              name="videoUrl"
              error={formik.errors.videoUrl}
              hint="Opcjonalny link zewnetrzny, np. YouTube lub Vimeo."
            >
              <Input
                disabled={formik.isSubmitting}
                id="videoUrl"
                name="videoUrl"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                placeholder="https://..."
                type="url"
                value={formik.values.videoUrl}
              />
            </Field>

            <Field
              label="Instrukcje"
              name="instructionText"
              error={formik.errors.instructionText}
              hint="Jedna instrukcja w wierszu. Pole moze zostac puste."
            >
              <Textarea
                disabled={formik.isSubmitting}
                id="instructionText"
                name="instructionText"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                placeholder={'Ustaw stopy na szerokosc bioder\nProwadz kolana za palcami'}
                value={formik.values.instructionText}
              />
            </Field>
          </section>
        </div>

        <aside className="h-fit rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-bold text-foreground">Wymagane pola</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
            <li>Nazwa cwiczenia</li>
            <li>Typ wyniku treningowego</li>
            <li>Sprzet lub opis innego sprzetu</li>
            <li>Glowna grupa miesniowa</li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Zdjecie cwiczenia jest poza tym pierwszym formularzem. Cwiczenie
            bez mediow nadal moze trafic do rutyny.
          </p>
        </aside>
      </div>
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

        <Button disabled={!canSubmit} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {formik.isSubmitting ? 'Zapisywanie...' : 'Dodaj cwiczenie'}
        </Button>
      </CardFooter>
    </CardForm>
  )
}

function validateExerciseForm(values: ExerciseFormValues) {
  const result = exerciseFormSchema.safeParse(values)
  const errors: FormikErrors<ExerciseFormValues> = {}

  if (result.success) {
    return errors
  }

  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string') {
      errors[key as keyof ExerciseFormValues] = issue.message
    }
  }

  return errors
}

function Field({
  children,
  error,
  hint,
  label,
  name,
}: {
  children: React.ReactNode
  error?: string
  hint?: string
  label: string
  name: keyof ExerciseFormValues
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      <FieldError error={error} id={`${name}-error`} />
    </div>
  )
}

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) {
    return null
  }

  return (
    <p className="flex items-start gap-2 text-xs font-medium leading-5 text-destructive" id={id}>
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
