import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    branch: 'main',
    message: 'Hello from Azure Production!',
    timestamp: new Date().toISOString()
  });
}