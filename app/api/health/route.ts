import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectWithRetry } from '@/lib/dbWithRetry'

export async function GET() {
  const startTime = Date.now()
  
  try {
    const dbStatus = mongoose.connection.readyState
    
    // Status map
    const dbStatusMap: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
    
    // If not connected, try to connect (with reduced retries for health check)
    if (dbStatus !== 1) {
      await connectWithRetry(2, 1000) // 2 attempts, 1s delay (faster for health checks)
    }
    
    // Ping database to verify it's actually responsive
    const pingStart = Date.now()
    await mongoose.connection.db?.admin().ping()
    const pingTime = Date.now() - pingStart
    
    const totalResponseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        state: 'connected',
        pingTime: `${pingTime}ms`,
        totalResponseTime: `${totalResponseTime}ms`
      },
      server: {
        uptime: Math.floor(process.uptime()),
        uptimeFormatted: formatUptime(process.uptime()),
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
        },
        nodeVersion: process.version
      },
      tier: 'M30'
    })
    
  } catch (error: any) {
    const totalResponseTime = Date.now() - startTime
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error.message,
          responseTime: `${totalResponseTime}ms`
        },
        server: {
          uptime: Math.floor(process.uptime()),
          nodeVersion: process.version
        }
      },
      { status: 503 }
    )
  }
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  
  return parts.join(' ')
}