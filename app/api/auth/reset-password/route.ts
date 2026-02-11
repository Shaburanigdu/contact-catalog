import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET для проверки токена
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Токен не указан' },
        { status: 400 }
      )
    }

    // Ищем пользователя с действующим токеном
    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires_at: {
          gt: new Date() // Токен не просрочен
        },
        deleted_at: null
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Неверная или просроченная ссылка для сброса пароля' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      message: 'Токен действителен',
      email: user.email,
      valid: true
    })
  } catch (error) {
    console.error('Ошибка проверки токена:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// POST для установки нового пароля
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Токен и пароль обязательны' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    // Ищем пользователя с действующим токеном
    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires_at: {
          gt: new Date() // Токен не просрочен
        },
        deleted_at: null
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Неверная или просроченная ссылка для сброса пароля' },
        { status: 400 }
      )
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Обновляем пароль и очищаем токен
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires_at: null,
        updated_at: new Date()
      }
    })

    console.log(`Пароль успешно изменен для пользователя: ${user.email}`)

    // В РЕАЛЬНОМ ПРИЛОЖЕНИИ ЗДЕСЬ БЫЛО БЫ ОТПРАВЛЕНИЕ EMAIL:
    // ====================================================
    // try {
    //   await transporter.sendMail({
    //     from: process.env.EMAIL_FROM,
    //     to: user.email,
    //     subject: 'Пароль изменен - Contact Catalog',
    //     html: `
    //       <h2>Пароль успешно изменен</h2>
    //       <p>Пароль для вашего аккаунта в Contact Catalog был успешно изменен.</p>
    //       <p>Если это были не вы, немедленно свяжитесь с поддержкой.</p>
    //     `
    //   })
    // } catch (emailError) {
    //   console.error('Ошибка отправки email:', emailError)
    //   // Не прерываем процесс, так как пароль уже изменен
    // }

    return NextResponse.json({
      message: 'Пароль успешно изменен',
      email: user.email
    })

  } catch (error) {
    console.error('Ошибка сброса пароля:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}