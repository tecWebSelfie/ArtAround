'use client'

import {
  createObjectOptions,
  mintOperationOptions,
  modelGenerationMutationOptions,
  modelGenerationOptions,
  modelObjectOptions,
  uploadModelReference,
} from '@/lib/model-generation-client'
import { objectAsset } from '@/lib/pascal/object-assets'
import { zGenerateModelBody, zReviseOperationBody } from '@/lib/pascal/mint/client/zod.gen'
import type { Object as MuseumObject } from '@/payload-types'
import type { AssetInput } from '@pascal-app/core'
import { useForm } from '@mantine/form'
import { Button, TextInput, Textarea } from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './object-catalog.module.css'

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : String(error ?? '')
}

/** The UI observes Payload jobs; server workflows own all generation and saving. */
export function ObjectModelGeneration({
  object,
  onPosition,
}: {
  object?: MuseumObject
  onPosition: (asset: AssetInput) => void
}) {
  const { t } = useTranslation('map-editor')
  const id = useId()
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
  const asset = currentObject.data
    ? objectAsset(currentObject.data)
    : object
      ? objectAsset(object)
      : null
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
      const urls = await Promise.all(
        references.map(({ file, requestId }) => uploadModelReference(file, requestId)),
      )
      const guidance =
        urls.length === 1 ? { imageUrl: urls[0] } : urls.length > 1 ? { sourceImages: urls } : {}
      const queued = await command.mutateAsync({
        objectId: targetId,
        command: {
          action: 'start',
          requestId: submissionId.current,
          generation: zGenerateModelBody.parse({ prompt: values.prompt, ...guidance }),
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
      const previewJobId =
        job.workflowSlug === 'interactiveObjectModel'
          ? String(job.id)
          : 'previewJobId' in job.input
            ? String(job.input.previewJobId)
            : ''
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

  return (
    <div className={styles.form}>
      {generation.isLoading && objectId ? (
        <p role="status">{t('Checking generation status…')}</p>
      ) : null}
      {generation.isError ? (
        <p className={styles.error} role="alert">
          {t('Could not load generation status.')}{' '}
          <Button variant="default" onClick={() => generation.refetch()} type="button">
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

      {asset && (!pending || finished) ? (
        <div className={styles.preview}>
          {asset.thumbnail ? <img alt={asset.name} src={asset.thumbnail} /> : null}
          <p>{t('Your object is ready to position on the map.')}</p>
          <Button onClick={() => onPosition(asset)} type="button">
            {t('Position')}
          </Button>
        </div>
      ) : null}

      {previewReady ? (
        <section className={styles.preview} aria-label={t('Model preview')}>
          {previewImage ? (
            <img alt={t('Generated object preview')} src={previewImage} />
          ) : (
            <p role="status">
              {operation.isError
                ? t('Could not load the preview image. Try reopening this window.')
                : t('Loading preview…')}
            </p>
          )}
          <p className={styles.hint}>
            {t('Review this preview before creating the final 3D model.')}
          </p>
          <Textarea
            id={`${id}-feedback`}
            label={t('What would you like to change?')}
            maxLength={2000}
            {...form.getInputProps('feedback')}
          />
          <div className={styles.actions}>
            <Button loading={command.isPending} onClick={() => review('approve')} type="button">
              {t('Approve and create model')}
            </Button>
            <Button
              variant="default"
              disabled={command.isPending || !form.values.feedback.trim()}
              onClick={() => review('revise')}
              type="button"
            >
              {t('Revise preview')}
            </Button>
          </div>
        </section>
      ) : null}

      {finished && !asset ? <p role="status">{t('Loading saved model…')}</p> : null}
      {job?.hasError && job.workflowSlug === 'finalizeObjectModel' ? (
        <Button
          variant="default"
          loading={command.isPending}
          onClick={() => review('approve')}
          type="button"
        >
          {t('Retry saving model')}
        </Button>
      ) : null}
      {!asset && !pending && !previewReady && job?.workflowSlug !== 'finalizeObjectModel' ? (
        <details open>
          <summary>{objectId ? t('Generate a model') : t('Create a new object')}</summary>
          <form className={styles.form} onSubmit={(event) => form.onSubmit(submit)(event)}>
            {!objectId ? (
              <TextInput
                id={`${id}-name`}
                label={t('Object title')}
                required
                maxLength={200}
                {...form.getInputProps('name')}
              />
            ) : (
              <strong>{currentObject.data?.name ?? object?.name}</strong>
            )}
            <Textarea
              id={`${id}-prompt`}
              label={t('Describe the object')}
              required
              maxLength={8000}
              {...form.getInputProps('prompt')}
            />
            <Dropzone
              aria-label={t('Reference images (optional)')}
              accept={['image/png', 'image/jpeg', 'image/webp']}
              maxSize={5 * 1024 * 1024}
              maxFiles={8}
              disabled={form.submitting}
              onDrop={(files) => {
                setReferences(files.map((file) => ({ file, requestId: crypto.randomUUID() })))
                submissionId.current = crypto.randomUUID()
              }}
              onReject={() =>
                form.setFieldError('prompt', t('Choose up to 8 images, each no larger than 5 MB.'))
              }
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
            <Button loading={form.submitting || command.isPending} type="submit">
              {t('Generate preview')}
            </Button>
          </form>
        </details>
      ) : null}
      {form.errors.prompt ? (
        <p className={styles.error} role="alert">
          {form.errors.prompt}
        </p>
      ) : null}
      {form.errors.feedback ? (
        <p className={styles.error} role="alert">
          {form.errors.feedback}
        </p>
      ) : null}
      {command.error ? (
        <p className={styles.error} role="alert">
          {errorMessage(command.error)}
        </p>
      ) : null}
    </div>
  )
}
