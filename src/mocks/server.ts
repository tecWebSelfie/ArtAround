import { setupServer } from 'msw/node'
import { handlers } from './handlers'

//questo mock server è per tutti gli ambienti non browser, come nodejs, jest, ecc.
export const server = setupServer(...handlers)
