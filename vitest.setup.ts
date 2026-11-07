import { config } from 'dotenv'

// Match Next's local development configuration without overriding CI process variables.
config({ path: process.env.DOTENV_CONFIG_PATH ?? ['.env.local', '.env'] })
