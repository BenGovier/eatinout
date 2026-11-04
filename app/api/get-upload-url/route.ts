import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'eatinout-staging-storage';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fileName = url.searchParams.get('fileName');
  const operation = url.searchParams.get('operation') || 'upload'; // 'upload' or 'delete'

  if (!fileName) {
    return NextResponse.json({ error: 'Missing fileName' }, { status: 400 });
  }

  try {
    if (operation === 'delete') {
      const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([fileName]);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Deleted from Supabase Storage' });
    }

    // Create a signed upload URL from Supabase Storage (valid for 15 minutes)
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(fileName);

    if (error || !data) {
      console.error('Supabase signed URL error:', error);
      return NextResponse.json(
        { error: 'Failed to generate upload URL', details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    });
  } catch (error) {
    console.error('Error generating Supabase Storage URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate upload URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
