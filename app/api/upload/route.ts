//app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, ApiResponse } from '@/lib/request-utils'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

// Допустимые MIME-типы
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

// POST /api/upload - Загрузить файл
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
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Файл не найден' },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false, 
          error: `Недопустимый тип файла. Допустимые типы: ${ALLOWED_MIME_TYPES.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Проверяем размер файла (максимум 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Размер файла не должен превышать 5MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Генерируем уникальное имя файла
    const fileExt = path.extname(file.name)
    const fileName = `${uuidv4()}${fileExt}`
    
    // Создаем директории по году и месяцу для организации
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    
    // Путь для сохранения
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(year), month)
    const filePath = path.join(uploadDir, fileName)

    // Создаем директории, если их нет
    const fs = await import('fs')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Оптимизируем и сохраняем изображение
    try {
      // Оптимизация для веба
      const optimizedImage = await sharp(buffer)
        .resize(800, 800, { // Максимальные размеры
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 }) // Преобразуем в JPEG с хорошим качеством
        .toBuffer()

      // Используем Uint8Array для записи файла
      await writeFile(filePath, new Uint8Array(optimizedImage))

      // Создаем превью (150x150)
      const thumbnailPath = path.join(uploadDir, `thumb_${fileName}`)
      const thumbnail = await sharp(buffer)
        .resize(150, 150, {
          fit: 'cover'
        })
        .jpeg({ quality: 80 })
        .toBuffer()

      await writeFile(thumbnailPath, new Uint8Array(thumbnail))

    } catch (sharpError) {
      console.error('Image processing error:', sharpError)
      // Если sharp не работает, сохраняем оригинал
      await writeFile(filePath, new Uint8Array(buffer))
    }

    // Возвращаем URL для доступа к файлу
    const fileUrl = `/uploads/${year}/${month}/${fileName}`
    const thumbnailUrl = `/uploads/${year}/${month}/thumb_${fileName}`

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { 
        url: fileUrl,
        thumbnailUrl,
        fileName,
        size: file.size,
        mimeType: file.type
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

// Утилита для удаления загруженного файла (опционально)
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    
    if (error || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'URL файла не указан' },
        { status: 400 }
      )
    }

    // Извлекаем путь из URL
    const filePath = path.join(process.cwd(), 'public', url)
    const fs = await import('fs')

    // Удаляем основной файл и превью
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      
      // Пытаемся найти и удалить превью
      const dir = path.dirname(filePath)
      const fileName = path.basename(filePath)
      const thumbPath = path.join(dir, `thumb_${fileName}`)
      
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath)
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Файл успешно удален',
    })
  } catch (error) {
    console.error('Failed to delete file:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Ошибка при удалении файла' },
      { status: 500 }
    )
  }
}