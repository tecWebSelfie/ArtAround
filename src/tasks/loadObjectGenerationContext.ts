import { Object } from '@/payload-types'
import { TaskConfig } from 'payload'

/**
 * Step 1 of generateObjectModel: read the object under generation and resolve
 * the generation context. The prompt comes from the job input when the caller
 * supplied one; otherwise it is built server-side from the object's own
 * editorial fields (never trust a client-supplied string for paid work).
 */
export const loadObjectGenerationContext: TaskConfig<'loadObjectGenerationContext'> = {
  slug: 'loadObjectGenerationContext',
  label: 'Resolve object context, prompt and generation guards',
  inputSchema: [
    {
      name: 'objectId',
      type: 'text',
      required: true,
    },
    // Optional caller-supplied prompt override; when omitted the prompt is
    // derived from the object's editorial fields.
    { name: 'prompt', type: 'text', required: false },
  ],
  outputSchema: [
    { name: 'name', type: 'text' },
    { name: 'prompt', type: 'text', required: true },
    { name: 'skip', type: 'checkbox' },
    { name: 'skipReason', type: 'text' },
  ],
  retries: 1,
  handler: async ({ input, req }) => {
    const object: Object = await req.payload.findByID({
      collection: 'objects',
      id: input.objectId,
      req,
    })

    // Belt-and-braces guard: the afterChange hook already enforces this, but
    // a manual queue (admin UI / future endpoint) could bypass it.
    // A human-uploaded model always wins over AI generation.
    if (object.model) {
      const existingModel = await req.payload.findByID({
        collection: 'objectsModels',
        id: typeof object.model === 'object' ? object.model.id : object.model,
        depth: 0,
        req,
      })
      if (existingModel.userGenerated) {
        return {
          output: {
            name: object.name,
            prompt: '',
            skip: true,
            skipReason: 'Object already has a user-uploaded model',
          },
        }
      }
    }

    return {
      output: {
        name: object.name,
        prompt: input.prompt?.trim() || `${object.name}. ${object.description ?? ''}`.trim(),
        skip: false,
      },
    }
  },
}
