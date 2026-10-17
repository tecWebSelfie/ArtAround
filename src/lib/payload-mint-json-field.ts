import type { JSONField } from 'payload'
import * as z from 'zod'

//small utility to remove minItems and maxItems from a JSON schema object recursively
function removeArrayLengthBounds(schema: unknown): void {
  if (!schema || typeof schema !== 'object') return
  if (Array.isArray(schema)) {
    schema.forEach(removeArrayLengthBounds)
    return
  }

  const jsonSchema = schema as Record<string, unknown>
  delete jsonSchema.minItems
  delete jsonSchema.maxItems
  Object.values(jsonSchema).forEach(removeArrayLengthBounds)
}

/**
 * Expose a generated Mint Zod contract to Payload's type generator and JSON
 * field config without maintaining a second copy of the Mint schema. Payload's
 * type generator turns bounded arrays into tuple unions, while the generated
 * Mint Zod correctly types them as arrays; Zod retains the runtime bounds.
 */
export function payloadMintJSONField(name: string, schema: z.ZodType): JSONField {
  const jsonSchema = z.toJSONSchema(schema, {
    io: 'input',
    target: 'draft-7',
  }) as NonNullable<JSONField['jsonSchema']>['schema']
  removeArrayLengthBounds(jsonSchema)

  return {
    name,
    type: 'json',
    jsonSchema: {
      fileMatch: ['*'],
      uri: `https://artaround.local/schemas/mint/${name}.json`,
      schema: jsonSchema,
    },
  }
}
