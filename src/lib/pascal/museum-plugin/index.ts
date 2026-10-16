import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'
import { ExhibitDefinition } from './ExhibitDefinition'

export const museumPlugin: Plugin = {
  id: 'artaround:museum-plugin',
  apiVersion: 1,
  // Plugin registration erases each node's concrete schema type; ParametricDescriptor callbacks make NodeDefinition invariant.
  nodes: [ExhibitDefinition as AnyNodeDefinition],
}
