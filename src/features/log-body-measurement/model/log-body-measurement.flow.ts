import type { Id } from '../../../../convex/_generated/dataModel'
import type { StoredMetricKey } from '#/entities/body-measurement'

export interface BodyMeasurementSubmission {
  numericFields: Partial<Record<StoredMetricKey, number>>
  note?: string
  photoFile?: File
  existingPhotoStorageId?: Id<'_storage'>
}

export interface BodyMeasurementCreatePayload {
  numericFields: Partial<Record<StoredMetricKey, number>>
  note?: string
  photoStorageId?: Id<'_storage'>
}

export interface UploadResult {
  storageId: Id<'_storage'>
}

export interface SubmissionDependencies {
  generateUploadUrl: () => Promise<string>
  uploadFile: (url: string, file: File) => Promise<UploadResult>
}

export interface SubmissionOutcome {
  photoStorageId?: Id<'_storage'>
  photoFailed: boolean
}

export async function prepareBodyMeasurementUpload(
  submission: BodyMeasurementSubmission,
  deps: SubmissionDependencies,
): Promise<SubmissionOutcome> {
  if (!submission.photoFile) {
    return {
      photoStorageId: submission.existingPhotoStorageId,
      photoFailed: false,
    }
  }

  try {
    const uploadUrl = await deps.generateUploadUrl()
    const result = await deps.uploadFile(uploadUrl, submission.photoFile)

    return { photoStorageId: result.storageId, photoFailed: false }
  } catch (_error) {
    return {
      photoStorageId: submission.existingPhotoStorageId,
      photoFailed: true,
    }
  }
}

export async function uploadFileToConvex(url: string, file: File): Promise<UploadResult> {
  const response = await fetch(url, {
    method: 'POST',
    headers: file.type ? { 'Content-Type': file.type } : undefined,
    body: file,
  })

  if (!response.ok) {
    throw new Error('Nie udalo sie wgrac zdjecia.')
  }

  const data = (await response.json()) as { storageId: Id<'_storage'> }

  return { storageId: data.storageId }
}
