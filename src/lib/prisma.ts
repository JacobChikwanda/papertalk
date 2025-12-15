import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create pg Pool with connection limits
// Supabase free tier: ~60 connections, paid: ~200
// Reserve connections for other operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '10'), // Maximum number of clients in the pool
  min: parseInt(process.env.DB_POOL_MIN || '2'), // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return error after 5 seconds if connection cannot be established
})

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

// Optional: Monitor pool stats in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    console.log('Pool stats:', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    })
  }, 30000) // Log every 30 seconds
}

// Create PrismaPg adapter
const adapter = new PrismaPg(pool)

let prismaInstance: PrismaClient | null = null;

try {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
} catch (error: any) {
  throw error;
}

const prisma = prismaInstance!

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { prisma }
