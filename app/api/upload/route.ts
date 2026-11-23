// app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, ApiResponse } from '@/lib/request-utils'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { UPLOAD_DIR } from '@/lib/uploads'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// POST /api/upload - Загрузить изображение
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Файл не найден' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Недопустимый тип файла. Допустимые типы: ${ALLOWED_MIME_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Размер файла не должен превышать 5MB' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Re-encode with sharp: this both optimises the image and guarantees the stored
    // file is a real JPEG, whatever the client claimed in its MIME type.
    let optimized: Buffer
    let thumbnail: Buffer
    try {
      optimized = await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()
      thumbnail = await sharp(buffer)
        .resize(150, 150, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer()
    } catch (sharpError) {
      console.error('Image processing error:', sharpError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Файл не является корректным изображением' },
        { status: 400 }
      )
    }

    const fileName = `${uuidv4()}.jpg`
    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const uploadDir = path.join(UPLOAD_DIR, year, month)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, fileName), new Uint8Array(optimized))
    await writeFile(path.join(uploadDir, `thumb_${fileName}`), new Uint8Array(thumbnail))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        url: `/uploads/${year}/${month}/${fileName}`,
        thumbnailUrl: `/uploads/${year}/${month}/thumb_${fileName}`,
        fileName,
        size: optimized.length,
        mimeType: 'image/jpeg',
      },
      message: 'Файл успешно загружен',
    })
  } catch (error) {
    console.error('Failed to upload file:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при загрузке файла' },
      { status: 500 }
    )
  }
}
