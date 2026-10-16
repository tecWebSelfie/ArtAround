import { Plugin } from '@pascal-app/core'
import { ExhibitDefinition } from './Exhibit'

export const museumPlugin: Plugin = {
  id: 'artaround:museum-plugin',
  apiVersion: 1,
  nodes: [ExhibitDefinition],
}
