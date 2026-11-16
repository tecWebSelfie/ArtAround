'use client'

import {
  createObjectOptions,
  mintOperationOptions,
  modelGenerationMutationOptions,
  modelGenerationOptions,
  modelObjectOptions,
  uploadModelReference,
} from '@/lib/model-generation-client'
import { errorMessage } from '@/components/editing/saving'
import { canSteerObject, type EditorViewer } from '@/lib/pascal/editor-viewer'
import { objectAsset } from '@/lib/pascal/object-assets'
import { zGenerateModelBody, zReviseOperationBody } from '@/lib/pascal/mint/client/zod.gen'
import type { Object as MuseumObject } from '@/payload-types'
import type { AssetInput } from '@pascal-app/core'
import { useForm, type UseFormReturnType } from '@mantine/form'
import { Button, Image, TextInput, Textarea } from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './object-catalog.module.css'

/** One reference image is the model's main view; several are its sources. */
function referenceGuidance(urls: string[]) {
  if (urls.length === 1) return { imageUrl: urls[0] }
  return urls.length > 1 ? { sourceImages: urls } : {}
}

/**
 * The generation's state and actions: the object (created on first submit),
 * the job the endpoint queued, its Mint preview, the form, and the two
 * actions (start a preview; approve or revise it).
 */
function useModelGeneration({ object, viewer }: { object?: MuseumObject; viewer: EditorViewer }) {
  const { t } = useTranslation('map-editor')
  const client = useQueryClient()
  const [objectId, setObjectId] = useState(object?.id ?? '')
  const [jobId, setJobId] = useState<string>()
  const [references, setReferences] = useState<Array<{ file: File; requestId: string }>>([])
  const submissionId = useRef(crypto.randomUUID())
  const revisionId = useRef(crypto.randomUUID())
  const create = useMutation(createObjectOptions(client))
  const command = useMutation(modelGenerationMutationOptions(client))
  const currentObject = useQuery(modelObjectOptions(objectId))
  const generation = useQuery(modelGenerationOptions(objectId, client, jobId))
  const job = generation.data
  const pending = Boolean(job && !job.completedAt && !job.hasError)
  const previewReady = Boolean(
    job?.completedAt && !job.hasError && job.workflowSlug === 'interactiveObjectModel',
  )
  const finished = Boolean(
    job?.completedAt && !job.hasError && job.workflowSlug === 'finalizeObjectModel',
  )
  const previewTask = job?.taskStatus.pollMintModelOperation?.['wait-preview']?.output
  const operation = useQuery(
    mintOperationOptions(previewReady ? (previewTask?.mintOperationId ?? '') : ''),
  )
  const assets = operation.data?.assets ?? previewTask?.operation.assets
  const previewImage = assets?.previewImageUrl ?? assets?.thumbnailUrl
  const savedObject = currentObject.data ?? object
  // A brand-new object is created by (hence owned by) the viewer.
  const canSteer = !objectId || canSteerObject(viewer, savedObject?.createdBy)
  const asset = savedObject ? objectAsset(savedObject) : null
  const form = useForm({
    initialValues: {
      name: object?.name ?? '',
      prompt: object?.description ?? object?.name ?? '',
      feedback: '',
    },
    onValuesChange: () => {
      submissionId.current = crypto.randomUUID()
      revisionId.current = crypto.randomUUID()
    },
    validate: {
      name: (name) => (!objectId && !name.trim() ? t('Enter an object title') : null),
      prompt: (prompt) => {
        // Non-owners send no prompt: the server derives it from the object.
        if (!canSteer) return null
        const parsed = zGenerateModelBody.safeParse({ prompt })
        return parsed.success ? null : parsed.error.issues[0]?.message
      },
    },
  })

  useEffect(() => {
    if (finished)
      notifications.show({
        id: `model-ready-${job?.id}`,
        title: t('Model ready'),
        message: t('Your object is ready to position on the map.'),
      })
  }, [finished, job?.id, t])

  // New reference images make a new request (a new id for the endpoint's dedupe).
  const chooseReferences = (files: File[]) => {
    setReferences(files.map((file) => ({ file, requestId: crypto.randomUUID() })))
    submissionId.current = crypto.randomUUID()
  }

  async function submit(values: typeof form.values) {
    try {
      const created = objectId
        ? null
        : await create.mutateAsync({
            name: values.name.trim(),
            description: values.prompt.slice(0, 500),
          })
      const targetId = objectId || created!.id
      if (created) {
        setObjectId(created.id)
        client.setQueryData(['model-object', created.id], created)
      }
      const urls = canSteer
        ? await Promise.all(
            references.map(({ file, requestId }) => uploadModelReference(file, requestId)),
          )
        : []
      const guidance = referenceGuidance(urls)
      const queued = await command.mutateAsync({
        objectId: targetId,
        command: {
          action: 'start',
          requestId: submissionId.current,
          generation: canSteer
            ? zGenerateModelBody.parse({ prompt: values.prompt, ...guidance })
            : undefined,
        },
      })
      setJobId(String(queued.id))
    } catch (error) {
      form.setFieldError('prompt', errorMessage(error))
    }
  }

  async function review(action: 'approve' | 'revise') {
    if (!job) return
    try {
      // The preview job itself, or the one a finalize job was started from.
      let previewJobId = ''
      if (job.workflowSlug === 'interactiveObjectModel') previewJobId = String(job.id)
      else if ('previewJobId' in job.input) previewJobId = String(job.input.previewJobId)
      const next = await command.mutateAsync({
        objectId,
        command:
          action === 'approve'
            ? { action, previewJobId, requestId: revisionId.current }
            : {
                action,
                previewJobId,
                requestId: revisionId.current,
                revision: zReviseOperationBody.parse({ feedback: form.values.feedback }),
              },
      })
      setJobId(String(next.id))
      revisionId.current = crypto.randomUUID()
      form.setFieldValue('feedback', '')
    } catch (error) {
      form.setFieldError('feedback', errorMessage(error))
    }
  }

  // Which part of the flow shows: the saved model, the preview to review,
  // a retry for a failed save, or the form that starts a generation.
  const finalizing = job?.workflowSlug === 'finalizeObjectModel'
  const view = {
    asset: asset && (!pending || finished) ? asset : null,
    savingModel: finished && !asset,
    retrySave: Boolean(job?.hasError && finalizing),
    form: !asset && !pending && !previewReady && !finalizing,
    existingName: objectId ? (currentObject.data?.name ?? object?.name ?? '') : null,
  }

  return {
    view,
    objectId,
    generation,
    job,
    pending,
    previewReady,
    operation,
    previewImage,
    canSteer,
    form,
    command,
    references,
    chooseReferences,
    submit,
    review,
  }
}

/**
 * The UI observes Payload jobs; server workflows own all generation and saving.
 *
 * Anyone may generate a missing model, but only the object's owner steers it
 * (prompt, reference images, revision feedback). For everyone else the form
 * offers a plain "generate from the object's data" action; the endpoint
 * enforces the same rule (`src/endpoints/objectModelGeneration.ts`).
 */
export function ObjectModelGeneration({
  object,
  onPosition,
  viewer,
}: {
  object?: MuseumObject
  onPosition: (asset: AssetInput) => void
  viewer: EditorViewer
}) {
  const id = useId()
  const { t } = useTranslation('map-editor')
  const {
    view,
    objectId,
    generation,
    job,
    pending,
    previewReady,
    operation,
    previewImage,
    canSteer,
    form,
    command,
    references,
    chooseReferences,
    submit,
    review,
  } = useModelGeneration({ object, viewer })
  return (
    <div className={styles.form}>
      <GenerationStatus
        loading={generation.isLoading && Boolean(objectId)}
        failed={generation.isError}
        onRetry={() => generation.refetch()}
        job={job}
        pending={pending}
      />

      {view.asset && <ReadyModel asset={view.asset} onPosition={onPosition} />}

      {previewReady ? (
        <PreviewReview
          image={previewImage}
          imageFailed={operation.isError}
          feedback={
            canSteer ? (
              <Textarea
                id={`${id}-feedback`}
                label={t('What would you like to change?')}
                maxLength={2000}
                {...form.getInputProps('feedback')}
              />
            ) : null
          }
          busy={command.isPending}
          onApprove={() => review('approve')}
          onRevise={canSteer ? () => review('revise') : undefined}
          canRevise={Boolean(form.values.feedback.trim())}
        />
      ) : null}

      {view.savingModel && <p role="status">{t('Loading saved model…')}</p>}
      {view.retrySave ? (
        <Button
          variant="default"
          loading={command.isPending}
          onClick={() => review('approve')}
          type="button"
        >
          {t('Retry saving model')}
        </Button>
      ) : null}
      {view.form ? (
        <GenerationForm
          idPrefix={id}
          existingName={view.existingName}
          canSteer={canSteer}
          form={form}
          onSubmit={submit}
          references={references}
          onReferences={chooseReferences}
          busy={form.submitting || command.isPending}
        />
      ) : null}
      {Object.entries({
        prompt: form.errors.prompt,
        feedback: form.errors.feedback,
        command: command.error && errorMessage(command.error),
      }).map(([slot, message]) =>
        message ? (
          <p key={slot} className={styles.error} role="alert">
            {message}
          </p>
        ) : null,
      )}
    </div>
  )
}

/** Where the generation job stands: loading, unreachable, failed, or running. */
function GenerationStatus({
  loading,
  failed,
  onRetry,
  job,
  pending,
}: {
  loading: boolean
  failed: boolean
  onRetry: () => void
  job:
    { hasError?: boolean | null; error?: unknown; workflowSlug?: string | null } | null | undefined
  pending: boolean
}) {
  const { t } = useTranslation('map-editor')
  return (
    <>
      {loading ? <p role="status">{t('Checking generation status…')}</p> : null}
      {failed ? (
        <p className={styles.error} role="alert">
          {t('Could not load generation status.')}{' '}
          <Button variant="default" onClick={onRetry} type="button">
            {t('Retry')}
          </Button>
        </p>
      ) : null}
      {job?.hasError ? (
        <p className={styles.error} role="alert">
          {errorMessage(job.error)}
        </p>
      ) : null}
      {pending ? (
        <div className={styles.status} role="status">
          <strong>
            {job?.workflowSlug === 'finalizeObjectModel'
              ? t('Creating and saving your model…')
              : t('Preparing your preview…')}
          </strong>
          <p className={styles.hint}>{t('You can close this window. Processing will continue.')}</p>
        </div>
      ) : null}
    </>
  )
}

/**
 * The preview to review before the final model: approve it, or (the owner
 * only) describe a change and revise it.
 */
function PreviewReview({
  image,
  imageFailed,
  feedback,
  busy,
  onApprove,
  onRevise,
  canRevise,
}: {
  image: string | null | undefined
  imageFailed: boolean
  feedback: ReactNode
  busy: boolean
  onApprove: () => void
  onRevise?: () => void
  canRevise: boolean
}) {
  const { t } = useTranslation('map-editor')
  return (
    <section className={styles.preview} aria-label={t('Model preview')}>
      {image ? (
        <Image alt={t('Generated object preview')} src={image} width={512} height={512} />
      ) : (
        <p role="status">
          {imageFailed
            ? t('Could not load the preview image. Try reopening this window.')
            : t('Loading preview…')}
        </p>
      )}
      <p className={styles.hint}>{t('Review this preview before creating the final 3D model.')}</p>
      {feedback}
      <div className={styles.actions}>
        <Button loading={busy} onClick={onApprove} type="button">
          {t('Approve and create model')}
        </Button>
        {onRevise ? (
          <Button variant="default" disabled={busy || !canRevise} onClick={onRevise} type="button">
            {t('Revise preview')}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

/** The owner's own description and reference images for the generation. */
function SteeringFields({
  prompt,
  references,
  disabled,
  onDrop,
  onReject,
}: {
  prompt: ReactNode
  references: { file: File; requestId: string }[]
  disabled: boolean
  onDrop: (files: File[]) => void
  onReject: () => void
}) {
  const { t } = useTranslation('map-editor')
  return (
    <>
      {prompt}
      <Dropzone
        aria-label={t('Reference images (optional)')}
        accept={['image/png', 'image/jpeg', 'image/webp']}
        maxSize={5 * 1024 * 1024}
        maxFiles={8}
        disabled={disabled}
        onDrop={onDrop}
        onReject={onReject}
      >
        <p>{t('Drop reference images here or click to choose files')}</p>
      </Dropzone>
      {references.length > 0 ? (
        <ul>
          {references.map(({ file, requestId }) => (
            <li key={requestId}>{file.name}</li>
          ))}
        </ul>
      ) : null}
      <p className={styles.hint}>{t('PNG, JPEG or WebP. Up to 8 images, 5 MB each.')}</p>
    </>
  )
}

type GenerationValues = { name: string; prompt: string; feedback: string }

/**
 * Starts a generation: a new object's title (or the existing object's name),
 * then the owner's description and reference images, or for anyone else a
 * note that the model comes from the object's own data.
 */
function GenerationForm({
  idPrefix,
  existingName,
  canSteer,
  form,
  onSubmit,
  references,
  onReferences,
  busy,
}: {
  idPrefix: string
  /** The object's name, or null for a new object (its title is asked). */
  existingName: string | null
  canSteer: boolean
  form: UseFormReturnType<GenerationValues>
  onSubmit: (values: GenerationValues) => Promise<void>
  references: { file: File; requestId: string }[]
  onReferences: (files: File[]) => void
  busy: boolean
}) {
  const { t } = useTranslation('map-editor')
  return (
    <details open>
      <summary>{existingName === null ? t('Create a new object') : t('Generate a model')}</summary>
      <form className={styles.form} onSubmit={(event) => form.onSubmit(onSubmit)(event)}>
        {existingName === null ? (
          <TextInput
            id={`${idPrefix}-name`}
            label={t('Object title')}
            required
            maxLength={200}
            {...form.getInputProps('name')}
          />
        ) : (
          <strong>{existingName}</strong>
        )}
        {canSteer ? (
          <SteeringFields
            prompt={
              <Textarea
                id={`${idPrefix}-prompt`}
                label={t('Describe the object')}
                required
                maxLength={8000}
                {...form.getInputProps('prompt')}
              />
            }
            references={references}
            disabled={form.submitting}
            onDrop={onReferences}
            onReject={() =>
              form.setFieldError('prompt', t('Choose up to 8 images, each no larger than 5 MB.'))
            }
          />
        ) : (
          <p className={styles.hint}>
            {t(
              "The model will be generated from the object's name, description and image. Only the object's owner can describe it differently.",
            )}
          </p>
        )}
        <Button loading={busy} type="submit">
          {t('Generate preview')}
        </Button>
      </form>
    </details>
  )
}

/** The saved model, ready to place: its thumbnail and the "Position" action. */
function ReadyModel({
  asset,
  onPosition,
}: {
  asset: AssetInput
  onPosition: (asset: AssetInput) => void
}) {
  const { t } = useTranslation('map-editor')
  return (
    <div className={styles.preview}>
      {/* Square box sized up front (`.preview img`), so the text and the
          button below don't jump when the picture arrives. */}
      {asset.thumbnail ? (
        <Image alt={asset.name} src={asset.thumbnail} width={512} height={512} />
      ) : null}
      <p>{t('Your object is ready to position on the map.')}</p>
      <Button onClick={() => onPosition(asset)} type="button">
        {t('Position')}
      </Button>
    </div>
  )
}
