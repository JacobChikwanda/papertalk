import { defineConfig, env } from '@prisma/config'
import { config } from 'dotenv'

// Load environment variables
config()

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
})
