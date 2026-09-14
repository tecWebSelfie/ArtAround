import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

//questo mock server è per tutti gli ambienti browser, come chrome, firefox, ecc.
export const worker = setupWorker(...handlers)
