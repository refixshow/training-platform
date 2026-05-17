import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { ArrowLeft, ArrowRight, Loader2, Save, X } from 'lucide-react'

import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import {
  emptyBodyMeasurementFormValues,
  type BodyMeasurementFormValues,
} from '#/entities/body-measurement'
import { Button } from '#/shared/ui/button'

import {
  prepareBodyMeasurementUpload,
  uploadFileToConvex,
} from '../model/log-body-measurement.flow'
import {
  BodyMeasurementFormSection,
  useBodyMeasurementForm,
  valuesFromMeasurement,
  wizardSteps,
  type BodyMeasurementFormResult,
} from './log-body-measurement-form'

export interface MeasurementForEdit {
  _id: Id<'bodyMeasurements'>
  bodyWeightKg?: number
  bodyFatPercent?: number
  neckCm?: number
  shoulderCm?: number
  chestCm?: number
  abdomenCm?: number
  waistCm?: number
  hipsCm?: number
  leftBicepCm?: number
  rightBicepCm?: number
  leftForearmCm?: number
  rightForearmCm?: number
  leftThighCm?: number
  rightThighCm?: number
  leftCalfCm?: number
  rightCalfCm?: number
  note?: string
  photoStorageId?: Id<'_storage'>
  photoUrl?: string | null
}

interface CommonProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (info: { photoFailed: boolean }) => void
}

interface LogModalProps extends CommonProps {
  mode?: 'create'
}

interface EditModalProps extends CommonProps {
  mode: 'edit'
  measurement: MeasurementForEdit
}

type Props = LogModalProps | EditModalProps

export function LogBodyMeasurementModal(props: LogModalProps) {
  return <BodyMeasurementModal {...props} />
}

export function EditBodyMeasurementModal(props: EditModalProps) {
  return <BodyMeasurementModal {...props} />
}

function BodyMeasurementModal(props: Props) {
  const { isOpen, onClose, onSaved } = props
  const isEditMode = props.mode === 'edit'

  const initialValues = useMemo<BodyMeasurementFormValues>(() => {
    if (isEditMode) {
      return valuesFromMeasurement(props.measurement)
    }
    return emptyBodyMeasurementFormValues
  }, [isEditMode, isEditMode ? props.measurement : null])

  const createMeasurement = useMutation(api.bodyMeasurements.create)
  const updateMeasurement = useMutation(api.bodyMeasurements.update)
  const generateUploadUrl = useMutation(api.bodyMeasurements.generateUploadUrl)

  const [stepIndex, setStepIndex] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const photoFileRef = useRef<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(
    isEditMode ? (props.measurement.photoUrl ?? null) : null,
  )
  const [existingPhotoStorageId, setExistingPhotoStorageId] = useState<
    Id<'_storage'> | undefined
  >(isEditMode ? props.measurement.photoStorageId : undefined)
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  const formik = useBodyMeasurementForm({
    initialValues,
    onSubmit: async (result: BodyMeasurementFormResult) => {
      setSubmitError(null)

      try {
        const uploadOutcome = await prepareBodyMeasurementUpload(
          {
            numericFields: result.numericFields,
            note: result.note,
            photoFile: photoFileRef.current ?? undefined,
            existingPhotoStorageId,
          },
          {
            generateUploadUrl: async () => await generateUploadUrl(),
            uploadFile: uploadFileToConvex,
          },
        )

        const payload = {
          ...result.numericFields,
          note: result.note,
          photoStorageId: uploadOutcome.photoStorageId,
        }

        if (isEditMode) {
          await updateMeasurement({
            measurementId: props.measurement._id,
            payload,
          })
        } else {
          await createMeasurement({ payload })
        }

        onSaved?.({ photoFailed: uploadOutcome.photoFailed })
        handleSilentClose()
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Nie udalo sie zapisac pomiaru. Sprobuj ponownie.',
        )
      }
    },
  })

  useEffect(() => {
    if (!isEditMode) {
      setExistingPhotoStorageId(undefined)
      setPhotoPreviewUrl(null)
    } else {
      setExistingPhotoStorageId(props.measurement.photoStorageId)
      setPhotoPreviewUrl(props.measurement.photoUrl ?? null)
    }
    photoFileRef.current = null
    setStepIndex(0)
    setSubmitError(null)
  }, [isEditMode, isEditMode ? props.measurement._id : 'create', isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    }

    if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  const handleSilentClose = useCallback(() => {
    photoFileRef.current = null
    setPhotoPreviewUrl(null)
    setExistingPhotoStorageId(undefined)
    setStepIndex(0)
    setSubmitError(null)
    formik.resetForm()
    onClose()
  }, [formik, onClose])

  const handleCloseWithGuard = useCallback(() => {
    if (formik.isSubmitting) return

    if (formik.dirty || photoFileRef.current) {
      const confirmed = window.confirm(
        'Wyjsc bez zapisania? Wprowadzone wartosci znikna.',
      )
      if (!confirmed) return
    }

    handleSilentClose()
  }, [formik.dirty, formik.isSubmitting, handleSilentClose])

  const handlePickPhoto = useCallback((file: File | null) => {
    photoFileRef.current = file

    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreviewUrl((previous) => {
        if (previous && previous.startsWith('blob:')) {
          URL.revokeObjectURL(previous)
        }
        return url
      })
    } else {
      setPhotoPreviewUrl((previous) => {
        if (previous && previous.startsWith('blob:')) {
          URL.revokeObjectURL(previous)
        }
        return null
      })
      setExistingPhotoStorageId(undefined)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl)
      }
    }
  }, [photoPreviewUrl])

  const totalSteps = wizardSteps.length
  const currentStep = wizardSteps[stepIndex]!
  const isLastStep = stepIndex === totalSteps - 1
  const hasAnyValue = useMemo(() => {
    return Object.entries(formik.values).some(([key, value]) => {
      if (key === 'note' || key === 'photoFileName') return false
      return typeof value === 'string' && value.trim() !== ''
    })
  }, [formik.values])

  const submitDisabled = !hasAnyValue && !photoFileRef.current
  const submittingLabel = formik.isSubmitting
    ? 'Zapisywanie...'
    : isEditMode
      ? 'Zapisz zmiany'
      : 'Zapisz pomiar'

  return (
    <dialog
      aria-labelledby="measurement-modal-title"
      className="m-0 w-full max-w-[36rem] rounded-lg border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-foreground/35 backdrop:backdrop-blur-sm sm:my-auto sm:mx-auto"
      onClose={handleSilentClose}
      onCancel={(event) => {
        event.preventDefault()
        handleCloseWithGuard()
      }}
      ref={dialogRef}
    >
      {isOpen ? (
        <form
          className="flex max-h-[90vh] flex-col"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (isLastStep) {
              setSubmitError(null)
              void formik.submitForm()
            } else {
              setStepIndex((previous) => Math.min(previous + 1, totalSteps - 1))
            }
          }}
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Krok {stepIndex + 1} z {totalSteps}
              </p>
              <h2
                className="mt-1 truncate text-xl font-bold text-foreground"
                id="measurement-modal-title"
              >
                {isEditMode ? 'Edytuj pomiar' : currentStep.title}
              </h2>
              <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
                {currentStep.caption}
              </p>
            </div>
            <button
              aria-label="Zamknij"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={handleCloseWithGuard}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </header>

          <StepIndicator stepIndex={stepIndex} totalSteps={totalSteps} />

          <div className="grow overflow-y-auto px-5 py-5">
            <BodyMeasurementFormSection
              formik={formik}
              step={currentStep}
              onPickPhoto={currentStep.id === 'limbs' ? handlePickPhoto : undefined}
              photoPreviewUrl={
                currentStep.id === 'limbs' ? photoPreviewUrl : undefined
              }
            />
          </div>

          <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-card px-5 py-4">
            <div aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
              {submitError}
              {!submitError && submitDisabled && stepIndex === totalSteps - 1 ? (
                <span className="text-muted-foreground">
                  Uzupelnij przynajmniej jeden pomiar albo dodaj zdjecie.
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                {stepIndex > 0 ? (
                  <Button
                    disabled={formik.isSubmitting}
                    onClick={() => setStepIndex((previous) => Math.max(previous - 1, 0))}
                    type="button"
                    variant="ghost"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Wstecz
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {currentStep.optional && !isLastStep ? (
                  <Button
                    disabled={formik.isSubmitting}
                    onClick={() => setStepIndex((previous) => Math.min(previous + 1, totalSteps - 1))}
                    type="button"
                    variant="secondary"
                  >
                    Pomin
                  </Button>
                ) : null}
                {isLastStep ? (
                  <Button disabled={formik.isSubmitting || submitDisabled} type="submit">
                    {formik.isSubmitting ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save aria-hidden="true" className="h-4 w-4" />
                    )}
                    {submittingLabel}
                  </Button>
                ) : (
                  <Button type="submit">
                    Dalej
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </footer>
        </form>
      ) : null}
    </dialog>
  )
}

function StepIndicator({
  stepIndex,
  totalSteps,
}: {
  stepIndex: number
  totalSteps: number
}) {
  return (
    <div
      aria-hidden="true"
      className="flex gap-1.5 border-b border-border bg-card px-5 pb-3 pt-1"
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <span
          className={
            index <= stepIndex
              ? 'h-1.5 grow rounded-full bg-primary transition-colors'
              : 'h-1.5 grow rounded-full bg-muted transition-colors'
          }
          key={index}
        />
      ))}
    </div>
  )
}
