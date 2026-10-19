import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'
import { ExitEntranceDefinition } from './ExitEntranceDefinition'
import { ServiceDefinition } from './ServiceDefinition'

export const museumPlugin: Plugin = {
  id: 'artaround:museum-plugin',
  apiVersion: 1,
  // Plugin registration erases each node's concrete schema type; ParametricDescriptor callbacks make NodeDefinition invariant.
  nodes: [
    ServiceDefinition as AnyNodeDefinition,
    ExitEntranceDefinition as AnyNodeDefinition,
  ],
}
