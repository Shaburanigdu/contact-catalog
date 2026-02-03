import { NextRequest } from 'next/server'
import { getCurrentUser } from './auth'
import { prisma } from './prisma'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export async function authenticateRequest(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { user: null, error: 'Не авторизован' }
  }

  return { user, error: null }
}

export async function getUserFromRequest(request: NextRequest) {
  const { user, error } = await authenticateRequest(request)
  
  if (error) {
    throw new Error(error)
  }

  return user
}

export function validateContactData(data: any): string[] {
  const errors: string[] = [];

  // Обязательные поля
  if (!data.first_name || data.first_name.trim() === '') {
    errors.push('Имя обязательно для заполнения');
  }

  // Проверка email
  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Некорректный email адрес');
    }
  }

  // Проверка URL
  if (data.website) {
    try {
      new URL(data.website);
    } catch {
      errors.push('Некорректный URL веб-сайта');
    }
  }

  // Проверка уровней отношений и доверия
  if (data.relationship_level) {
    const level = parseInt(data.relationship_level);
    if (isNaN(level) || level < 1 || level > 10) {
      errors.push('Уровень отношений должен быть числом от 1 до 10');
    }
  }

  if (data.trust_level) {
    const level = parseInt(data.trust_level);
    if (isNaN(level) || level < 1 || level > 10) {
      errors.push('Уровень доверия должен быть числом от 1 до 10');
    }
  }

  // Проверка дат
  if (data.date_of_birth) {
    const dob = new Date(data.date_of_birth);
    if (isNaN(dob.getTime()) || dob > new Date()) {
      errors.push('Некорректная дата рождения');
    }
  }

  if (data.met_date) {
    const metDate = new Date(data.met_date);
    if (isNaN(metDate.getTime()) || metDate > new Date()) {
      errors.push('Некорректная дата знакомства');
    }
  }

  // Проверка тегов
  if (data.tags && Array.isArray(data.tags)) {
    data.tags.forEach((tagId: string, index: number) => {
      if (typeof tagId !== 'string' || tagId.trim() === '') {
        errors.push(`Некорректный ID тега на позиции ${index + 1}`);
      }
    });
  }

  return errors;
}

export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: any,
  newValues?: any,
  request?: NextRequest
) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        // Исправлено: у NextRequest нет свойства ip, используем заголовок
        ip_address: request?.headers.get('x-forwarded-for') || 
                   request?.headers.get('x-real-ip') || 
                   undefined,
        user_agent: request?.headers.get('user-agent') || undefined,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}