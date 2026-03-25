import { NextResponse } from 'next/server'
import {
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential
} from '@azure/storage-blob'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const fileName = url.searchParams.get('fileName')
  const operation = url.searchParams.get('operation') || 'upload' // 'upload' or 'delete'

  if (!fileName) {
    return NextResponse.json({ error: 'Missing fileName' }, { status: 400 })
  }

  // Check if environment variables are set
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY
  const containerName = process.env.AZURE_CONTAINER_NAME

  if (!accountName || !accountKey || !containerName) {
    console.error('Missing Azure environment variables:', {
      accountName: !!accountName,
      accountKey: !!accountKey,
      containerName: !!containerName
    })
    return NextResponse.json({ 
      error: 'Azure storage configuration missing',
      details: 'Please check AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, and AZURE_CONTAINER_NAME environment variables'
    }, { status: 500 })
  }

  try {
    const credential = new StorageSharedKeyCredential(accountName, accountKey)

    const startsOn = new Date(Date.now() - 5 * 60 * 1000)
    const expiresOn = new Date(Date.now() + 30 * 60 * 1000)

    // Set permissions based on operation
    let permissions: BlobSASPermissions
    if (operation === 'delete') {
      permissions = BlobSASPermissions.parse('d') // delete
    } else {
      permissions = BlobSASPermissions.parse('cw') // create + write
    }

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: fileName,
        permissions,
        startsOn,
        expiresOn
      },
      credential
    ).toString()

    const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}?${sasToken}`

    return NextResponse.json({ uploadUrl })
  } catch (error) {
    console.error('Error generating SAS token:', error)
    return NextResponse.json({ 
      error: 'Failed to generate upload URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
