import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import cloudinary from '@/lib/cloudinary'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'service-pro'
    const customName = formData.get('fileName') as string | null

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Invalid file type. Only JPG, PNG, WEBP and PDF allowed' }, { status: 400 })
    }

    const isPdf = file.type === 'application/pdf'
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ─── PDFs: save locally and serve via /api/files route ───────────────────
    if (isPdf) {
      // Build clean filename
      const originalName = file.name.replace(/\.[^.]+$/, '')
      const baseName = customName
        ? customName.replace(/[^a-zA-Z0-9_\-]/g, '_')
        : originalName.replace(/[^a-zA-Z0-9_\-]/g, '_')
      const fileName = `${baseName}_${Date.now()}.pdf`

      // Save to public/uploads/folder/ so it's accessible
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, fileName), buffer)

      // Return a URL that points to the file via Next.js static serving
      const fileUrl = `/uploads/${folder}/${fileName}`

      return NextResponse.json({
        url: fileUrl,
        publicId: fileName,
      })
    }

    // ─── Images: upload to Cloudinary as before ───────────────────────────────
    const originalName = file.name.replace(/\.[^.]+$/, '')
    const baseName = customName
      ? customName.replace(/[^a-zA-Z0-9_\-]/g, '_')
      : originalName.replace(/[^a-zA-Z0-9_\-]/g, '_')

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `service-pro/${folder}`,
            resource_type: 'image',
            public_id: baseName,
            overwrite: false,
            transformation: (folder === 'profile-photos' || folder === 'employee-photos')
              ? [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
              : undefined,
          },
          (error, result) => {
            if (error || !result) reject(error)
            else resolve(result as { secure_url: string; public_id: string })
          }
        ).end(buffer)
      }
    )

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 })
  }
}