import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      )
    }

    // Ищем пользователя
    const user = await prisma.user.findUnique({
      where: { email, deleted_at: null }
    })

    if (!user) {
      // В реальном приложении не сообщаем, что пользователь не найден
      return NextResponse.json({
        message: 'Если email существует, инструкции отправлены'
      })
    }

    // Генерируем токен сброса пароля
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 час

    // Сохраняем токен в базе данных
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: resetToken,
        password_reset_expires_at: resetTokenExpiry
      }
    })

    // В РЕАЛЬНОМ ПРИЛОЖЕНИИ ЗДЕСЬ БЫЛО БЫ ОТПРАВЛЕНИЕ EMAIL:
    // ====================================================
    // const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`
    // 
    // try {
    //   await transporter.sendMail({
    //     from: process.env.EMAIL_FROM,
    //     to: user.email,
    //     subject: 'Сброс пароля - Contact Catalog',
    //     html: `
    //       <h2>Сброс пароля</h2>
    //       <p>Вы запросили сброс пароля для вашего аккаунта в Contact Catalog.</p>
    //       <p>Для установки нового пароля перейдите по ссылке:</p>
    //       <a href="${resetUrl}">${resetUrl}</a>
    //       <p>Ссылка действительна 1 час.</p>
    //       <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
    //     `
    //   })
    // } catch (emailError) {
    //   console.error('Ошибка отправки email:', emailError)
    //   return NextResponse.json(
    //     { error: 'Ошибка при отправке email' },
    //     { status: 500 }
    //   )
    // }

    // Для демо-режима возвращаем токен в ответе
    return NextResponse.json({
      message: 'Если email существует, инструкции отправлены',
      resetToken, // Только для демо-режима!
      resetUrl: `/reset-password/${resetToken}` // Для демо-режима
    })

  } catch (error) {
    console.error('Ошибка запроса сброса пароля:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}