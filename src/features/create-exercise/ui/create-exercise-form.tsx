import { useState } from 'react'
import type { FormikErrors } from 'formik'
import { useFormik } from 'formik'
import { ListPlus, Save } from 'lucide-react'
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
import {
  muscleGroupOptions,
  type MuscleGroup,
} from '#/entities/muscle-group'
import { Button } from '#/shared/ui/button'
import {
  CardBody,
  CardFooter,
  CardForm,
  CardHeader,
} from '#/shared/ui/card'
import { FieldError, FormField, getFieldA11y } from '#/shared/ui/form-field'
import { Input, Select, Textarea } from '#/shared/ui/input'
import { StatusMessage } from '#/shared/ui/status-message'

interface CreateExerciseFormProps {
  exerciseId?: Id<'exercises'>
  initialValues?: ExerciseFormValues
  mode?: 'create' | 'edit'
  onCancel?: () => void
  onCreated?: () => void
  onSaved?: () => void
}

const muscleGroups = muscleGroupOptions

export function CreateExerciseForm({
  exerciseId,
  initialValues = emptyExerciseFormValues,
  mode = 'create',
  onCancel,
  onCreated,
  onSaved,
}: CreateExerciseFormProps) {
  const createExercise = useMutation(api.exercises.create)
  const updateExercise = useMutation(api.exercises.update)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const formik = useFormik<ExerciseFormValues>({
    enableReinitialize: true,
    initialValues,
    validate: validateExerciseForm,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSubmitError(null)
      setSubmitSuccess(null)

      const parsed = exerciseFormSchema.parse(values)

      try {
        const payload = {
          customEquipment: parsed.customEquipment?.trim() || undefined,
          equipment: parsed.equipment,
          instructions: splitInstructionText(parsed.instructionText),
          name: parsed.name,
          primaryMuscleGroup: parsed.primaryMuscleGroup as MuscleGroup,
          secondaryMuscleGroups: parsed.secondaryMuscleGroups as MuscleGroup[],
          type: parsed.type,
          videoUrl: parsed.videoUrl?.trim() || undefined,
        }

        if (mode === 'edit' && exerciseId) {
          await updateExercise({
            exerciseId,
            ...payload,
          })
        } else {
          await createExercise(payload)
        }

        if (mode === 'create') {
          helpers.resetForm()
          onCreated?.()
        }

        setSubmitSuccess(
          mode === 'edit'
            ? 'Cwiczenie zostalo zaktualizowane.'
            : 'Cwiczenie zostalo dodane do biblioteki.',
        )
        onSaved?.()
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

  const selectedPrimary = formik.values.primaryMuscleGroup
  const canSubmit = !formik.isSubmitting

  return (
    <CardForm
      noValidate
      onSubmit={formik.handleSubmit}
    >
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ListPlus aria-hidden="true" className="h-4 w-4" />
          {mode === 'edit' ? 'Edycja cwiczenia' : 'Nowe cwiczenie'}
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {mode === 'edit' ? 'Aktualizuj dane biblioteki' : 'Dane do rutyn i wynikow'}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {mode === 'edit'
            ? 'Zmien nazwe, typ wyniku, sprzet, klasyfikacje albo materialy pomocnicze.'
            : 'Wypelnij tylko pola wymagane. Media i instrukcje mozna uzupelnic pozniej.'}
        </p>
      </CardHeader>

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
              <FormField label="Nazwa" name="name" error={formik.errors.name}>
                <Input
                  {...getFieldA11y('name', formik.errors.name)}
                  disabled={formik.isSubmitting}
                  id="name"
                  name="name"
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  placeholder="Np. Goblet squat"
                  value={formik.values.name}
                />
              </FormField>

              <FormField label="Typ cwiczenia" name="type" error={formik.errors.type}>
                <Select
                  {...getFieldA11y('type', formik.errors.type)}
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
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Sprzet"
                name="equipment"
                error={formik.errors.equipment}
              >
                <Select
                  {...getFieldA11y('equipment', formik.errors.equipment)}
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
              </FormField>

              {formik.values.equipment === 'other' ? (
                <FormField
                  label="Nazwa sprzetu"
                  name="customEquipment"
                  error={formik.errors.customEquipment}
                >
                  <Input
                    {...getFieldA11y(
                      'customEquipment',
                      formik.errors.customEquipment,
                    )}
                    disabled={formik.isSubmitting}
                    id="customEquipment"
                    name="customEquipment"
                    onBlur={formik.handleBlur}
                    onChange={formik.handleChange}
                    placeholder="Np. sled, landmine"
                    value={formik.values.customEquipment}
                  />
                </FormField>
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

            <FormField
              label="Glowna grupa miesniowa"
              name="primaryMuscleGroup"
              error={formik.errors.primaryMuscleGroup}
            >
              <Select
                {...getFieldA11y(
                  'primaryMuscleGroup',
                  formik.errors.primaryMuscleGroup,
                )}
                disabled={formik.isSubmitting}
                id="primaryMuscleGroup"
                name="primaryMuscleGroup"
                onBlur={formik.handleBlur}
                onChange={(event) => {
                  const nextPrimary = event.target.value
                  void formik.setFieldValue('primaryMuscleGroup', nextPrimary)
                  void formik.setFieldValue(
                    'secondaryMuscleGroups',
                    formik.values.secondaryMuscleGroups.filter(
                      (id) => id !== nextPrimary,
                    ),
                  )
                }}
                value={formik.values.primaryMuscleGroup}
              >
                <option value="">Wybierz grupe</option>
                {muscleGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="grid gap-2">
              <span
                className="text-sm font-semibold text-foreground"
                id="secondaryMuscleGroups-label"
              >
                Dodatkowe grupy miesniowe
              </span>
              <div
                aria-describedby={
                  typeof formik.errors.secondaryMuscleGroups === 'string'
                    ? 'secondaryMuscleGroups-error'
                    : undefined
                }
                aria-invalid={
                  typeof formik.errors.secondaryMuscleGroups === 'string'
                    ? true
                    : undefined
                }
                aria-labelledby="secondaryMuscleGroups-label"
                className="grid gap-2 sm:grid-cols-2"
                role="group"
              >
                {muscleGroups.map((group) => {
                  const isPrimary = selectedPrimary === group.id
                  const checked = formik.values.secondaryMuscleGroups.includes(
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
                        name="secondaryMuscleGroups"
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [
                                ...formik.values.secondaryMuscleGroups,
                                group.id,
                              ]
                            : formik.values.secondaryMuscleGroups.filter(
                                (id) => id !== group.id,
                              )

                          void formik.setFieldValue(
                            'secondaryMuscleGroups',
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
                  typeof formik.errors.secondaryMuscleGroups === 'string'
                    ? formik.errors.secondaryMuscleGroups
                    : undefined
                }
                id="secondaryMuscleGroups-error"
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

            <FormField
              label="Link wideo"
              name="videoUrl"
              error={formik.errors.videoUrl}
              hint="Opcjonalny link zewnetrzny, np. YouTube lub Vimeo."
            >
              <Input
                {...getFieldA11y('videoUrl', formik.errors.videoUrl, true)}
                disabled={formik.isSubmitting}
                id="videoUrl"
                name="videoUrl"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                placeholder="https://..."
                type="url"
                value={formik.values.videoUrl}
              />
            </FormField>

            <FormField
              label="Instrukcje"
              name="instructionText"
              error={formik.errors.instructionText}
              hint="Jedna instrukcja w wierszu. Pole moze zostac puste."
            >
              <Textarea
                {...getFieldA11y(
                  'instructionText',
                  formik.errors.instructionText,
                  true,
                )}
                disabled={formik.isSubmitting}
                id="instructionText"
                name="instructionText"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                placeholder={'Ustaw stopy na szerokosc bioder\nProwadz kolana za palcami'}
                value={formik.values.instructionText}
              />
            </FormField>
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
            <StatusMessage size="md" tone="error">{submitError}</StatusMessage>
          ) : null}
          {submitSuccess ? (
            <StatusMessage size="md" tone="success">{submitSuccess}</StatusMessage>
          ) : null}
        </div>

        <Button disabled={!canSubmit} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
          {formik.isSubmitting
            ? 'Zapisywanie...'
            : mode === 'edit'
              ? 'Zapisz zmiany'
              : 'Dodaj cwiczenie'}
        </Button>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Anuluj
          </Button>
        ) : null}
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

