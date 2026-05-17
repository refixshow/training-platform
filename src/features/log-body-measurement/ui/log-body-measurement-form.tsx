import { useMemo, useRef } from 'react'
import type { FormikErrors, FormikProps } from 'formik'
import { useFormik } from 'formik'
import { AlertCircle, Image as ImageIcon, X } from 'lucide-react'

import {
  bodyMeasurementFormSchema,
  emptyBodyMeasurementFormValues,
  getMetricDef,
  metricDefinitions,
  type BodyMeasurementFormValues,
  type MetricGroup,
  type StoredMetricKey,
} from '#/entities/body-measurement'
import { Input, Textarea } from '#/shared/ui/input'

export type WizardStepId = 'body' | 'torso' | 'limbs'

export interface WizardStep {
  id: WizardStepId
  title: string
  caption: string
  fields: readonly StoredMetricKey[]
  optional: boolean
}

export const wizardSteps: readonly WizardStep[] = [
  {
    id: 'body',
    title: 'Waga i sklad',
    caption: 'Najwazniejsze dane. Pomin pojedyncze pole jesli go dzis nie mierzysz.',
    fields: ['bodyWeightKg', 'bodyFatPercent'],
    optional: false,
  },
  {
    id: 'torso',
    title: 'Tulow',
    caption: 'Obwody tulowia. Wszystkie pola sa opcjonalne.',
    fields: ['neckCm', 'shoulderCm', 'chestCm', 'abdomenCm', 'waistCm', 'hipsCm'],
    optional: true,
  },
  {
    id: 'limbs',
    title: 'Konczyny i zdjecie',
    caption: 'Pomiary lewej i prawej strony. Mozesz dodac zdjecie postepu.',
    fields: [
      'leftBicepCm',
      'rightBicepCm',
      'leftForearmCm',
      'rightForearmCm',
      'leftThighCm',
      'rightThighCm',
      'leftCalfCm',
      'rightCalfCm',
    ],
    optional: true,
  },
]

export interface BodyMeasurementFormResult {
  numericFields: Partial<Record<StoredMetricKey, number>>
  note?: string
}

export interface UseBodyMeasurementFormArgs {
  initialValues?: BodyMeasurementFormValues
  onSubmit: (
    result: BodyMeasurementFormResult,
    helpers: { resetForm: () => void },
  ) => Promise<void> | void
}

export function useBodyMeasurementForm({
  initialValues = emptyBodyMeasurementFormValues,
  onSubmit,
}: UseBodyMeasurementFormArgs) {
  return useFormik<BodyMeasurementFormValues>({
    enableReinitialize: true,
    initialValues,
    validateOnBlur: true,
    validateOnChange: false,
    validate: validateBodyMeasurementForm,
    onSubmit: async (values, helpers) => {
      const result = bodyMeasurementFormSchema.safeParse(values)

      if (!result.success) {
        const errors: FormikErrors<BodyMeasurementFormValues> = {}

        for (const issue of result.error.issues) {
          const key = issue.path[0]
          if (typeof key === 'string') {
            errors[key as keyof BodyMeasurementFormValues] = issue.message
          }
        }

        helpers.setErrors(errors)
        helpers.setSubmitting(false)
        return
      }

      const numericFields: Partial<Record<StoredMetricKey, number>> = {}

      for (const key of Object.keys(result.data) as Array<keyof typeof result.data>) {
        if (key === 'note' || key === 'photoFileName') continue
        const value = result.data[key]
        if (typeof value === 'number') {
          numericFields[key as StoredMetricKey] = value
        }
      }

      try {
        await onSubmit(
          {
            numericFields,
            note: result.data.note,
          },
          { resetForm: helpers.resetForm },
        )
      } finally {
        helpers.setSubmitting(false)
      }
    },
  })
}

function validateBodyMeasurementForm(values: BodyMeasurementFormValues) {
  const result = bodyMeasurementFormSchema.safeParse(values)
  const errors: FormikErrors<BodyMeasurementFormValues> = {}

  if (result.success) {
    return errors
  }

  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string') {
      const fieldKey = key as keyof BodyMeasurementFormValues
      if (!errors[fieldKey]) {
        errors[fieldKey] = issue.message
      }
    }
  }

  return errors
}

interface BodyMeasurementFormSectionProps {
  formik: FormikProps<BodyMeasurementFormValues>
  step: WizardStep
  onPickPhoto?: (file: File | null) => void
  photoPreviewUrl?: string | null
}

export function BodyMeasurementFormSection({
  formik,
  step,
  onPickPhoto,
  photoPreviewUrl,
}: BodyMeasurementFormSectionProps) {
  const groupedFields = useMemo(() => groupFieldsByGroup(step.fields), [step.fields])

  return (
    <div className="grid gap-6">
      {step.id === 'body' ? (
        <>
          <MetricGrid fields={step.fields} formik={formik} columns={2} />
          <Field label="Notatka" name="note" hint="Maks. 500 znakow. Opcjonalne.">
            <Textarea
              {...getA11y('note', formik.errors.note, true)}
              disabled={formik.isSubmitting}
              id="note"
              name="note"
              onBlur={formik.handleBlur}
              onChange={formik.handleChange}
              placeholder="Np. Pomiar po porannym treningu, na czczo."
              value={formik.values.note}
            />
            <FieldError error={formik.errors.note} id="note-error" />
          </Field>
        </>
      ) : null}

      {step.id === 'torso' ? (
        <div className="grid gap-5">
          {groupedFields.map(({ groupKey, fields }) => (
            <div className="grid gap-3" key={groupKey}>
              <MetricGrid fields={fields} formik={formik} columns={2} />
            </div>
          ))}
        </div>
      ) : null}

      {step.id === 'limbs' ? (
        <>
          <PairedMetricGrid pairs={limbPairs} formik={formik} />
          {onPickPhoto ? (
            <PhotoPicker
              disabled={formik.isSubmitting}
              fileName={formik.values.photoFileName}
              onChange={(file) => {
                onPickPhoto(file)
                void formik.setFieldValue('photoFileName', file?.name ?? '')
              }}
              previewUrl={photoPreviewUrl}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function groupFieldsByGroup(fields: readonly StoredMetricKey[]) {
  const buckets = new Map<MetricGroup, StoredMetricKey[]>()

  for (const field of fields) {
    const def = getMetricDef(field)
    const list = buckets.get(def.group) ?? []
    list.push(field)
    buckets.set(def.group, list)
  }

  return Array.from(buckets.entries()).map(([groupKey, list]) => ({
    groupKey,
    fields: list,
  }))
}

const limbPairs: ReadonlyArray<readonly [StoredMetricKey, StoredMetricKey]> = [
  ['leftBicepCm', 'rightBicepCm'],
  ['leftForearmCm', 'rightForearmCm'],
  ['leftThighCm', 'rightThighCm'],
  ['leftCalfCm', 'rightCalfCm'],
]

interface MetricGridProps {
  fields: readonly StoredMetricKey[]
  formik: FormikProps<BodyMeasurementFormValues>
  columns: 1 | 2
}

function MetricGrid({ fields, formik, columns }: MetricGridProps) {
  const className = columns === 2 ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'

  return (
    <div className={className}>
      {fields.map((field) => (
        <MetricField field={field} formik={formik} key={field} />
      ))}
    </div>
  )
}

interface PairedMetricGridProps {
  pairs: ReadonlyArray<readonly [StoredMetricKey, StoredMetricKey]>
  formik: FormikProps<BodyMeasurementFormValues>
}

function PairedMetricGrid({ pairs, formik }: PairedMetricGridProps) {
  return (
    <div className="grid gap-3">
      {pairs.map(([left, right]) => (
        <div className="grid gap-3 sm:grid-cols-2" key={`${left}-${right}`}>
          <MetricField field={left} formik={formik} />
          <MetricField field={right} formik={formik} />
        </div>
      ))}
    </div>
  )
}

interface MetricFieldProps {
  field: StoredMetricKey
  formik: FormikProps<BodyMeasurementFormValues>
}

function MetricField({ field, formik }: MetricFieldProps) {
  const metric = getMetricDef(field)
  const error = formik.errors[field]

  return (
    <Field
      label={metric.label}
      name={field}
      hint={`${metric.min}–${metric.max} ${metric.unit}`}
    >
      <div className="relative">
        <Input
          {...getA11y(field, error)}
          disabled={formik.isSubmitting}
          id={field}
          inputMode="decimal"
          name={field}
          onBlur={formik.handleBlur}
          onChange={formik.handleChange}
          placeholder="0,0"
          value={formik.values[field]}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground"
        >
          {metric.unit}
        </span>
      </div>
      <FieldError error={error} id={`${field}-error`} />
    </Field>
  )
}

interface PhotoPickerProps {
  disabled: boolean
  fileName: string
  onChange: (file: File | null) => void
  previewUrl?: string | null
}

function PhotoPicker({ disabled, fileName, onChange, previewUrl }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasFile = Boolean(fileName)

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-foreground">Zdjecie progresu (opcjonalne)</span>
      <div className="flex items-start gap-3">
        <button
          aria-label={hasFile ? 'Zmien zdjecie' : 'Dodaj zdjecie'}
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {previewUrl ? (
            <img
              alt="Podglad zdjecia"
              className="h-full w-full rounded-md object-cover"
              src={previewUrl}
            />
          ) : (
            <ImageIcon aria-hidden="true" className="h-6 w-6" />
          )}
        </button>
        <div className="min-w-0 grow">
          <p className="truncate text-sm font-semibold text-foreground">
            {fileName || 'Brak wybranego pliku'}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Plik wgrywa sie dopiero przy zapisie. Akceptowane: JPG, PNG.
          </p>
          {hasFile ? (
            <button
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
              disabled={disabled}
              onClick={() => onChange(null)}
              type="button"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Usun zdjecie
            </button>
          ) : null}
        </div>
      </div>
      <input
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          onChange(file)
          event.target.value = ''
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  )
}

function Field({
  children,
  hint,
  label,
  name,
}: {
  children: React.ReactNode
  hint?: string
  label: string
  name: string
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-semibold text-foreground" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs leading-5 text-muted-foreground" id={`${name}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) {
    return null
  }

  return (
    <p
      className="flex items-start gap-1.5 text-xs font-medium leading-5 text-destructive"
      id={id}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{error}</span>
    </p>
  )
}

function getA11y(name: string, error: string | undefined, hasHint = false) {
  const describedBy = [
    hasHint ? `${name}-hint` : undefined,
    error ? `${name}-error` : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : undefined,
  }
}

export function valuesFromMeasurement(
  measurement: Partial<Record<StoredMetricKey, number | undefined>> & {
    note?: string
  },
): BodyMeasurementFormValues {
  const base: BodyMeasurementFormValues = { ...emptyBodyMeasurementFormValues }

  for (const metric of metricDefinitions) {
    if (metric.derived) continue
    const key = metric.key as StoredMetricKey
    const value = measurement[key]
    base[key] = value === undefined || value === null ? '' : formatInputValue(value)
  }

  base.note = measurement.note ?? ''
  return base
}

function formatInputValue(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    useGrouping: false,
  }).format(value)
}
