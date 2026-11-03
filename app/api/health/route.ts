import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Ping Supabase to verify database is responsive
    const pingStart = Date.now();
    const { error } = await supabaseAdmin
      .from('tags')
      .select('id', { count: 'exact', head: true });

    if (error) {
      throw new Error(error.message);
    }

    const pingTime = Date.now() - pingStart;
    const totalResponseTime = Date.now() - startTime;

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
      tier: 'Supabase'
    });

  } catch (error: any) {
    const totalResponseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error.message || 'Database connection error',
          responseTime: `${totalResponseTime}ms`
        },
        server: {
          uptime: Math.floor(process.uptime()),
          nodeVersion: process.version
        }
      },
      { status: 503 }
    );
  }
}