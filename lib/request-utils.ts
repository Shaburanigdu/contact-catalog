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

export function validateContactData(data: any) {
  const errors: string[] = []

  // Проверяем, что есть хотя бы одно из полей: email, phone, first_name
  if (!data.email && !data.phone && !data.first_name) {
    errors.push('Необходимо указать email, телефон или имя')
  }

  // Проверяем relationship_level (1-10)
  if (data.relationship_level !== undefined) {
    const level = parseInt(data.relationship_level)
    if (isNaN(level) || level < 1 || level > 10) {
      errors.push('Уровень близости должен быть от 1 до 10')
    }
  }

  // Проверяем trust_level (1-10)
  if (data.trust_level !== undefined) {
    const level = parseInt(data.trust_level)
    if (isNaN(level) || level < 1 || level > 10) {
      errors.push('Уровень доверия должен быть от 1 до 10')
    }
  }

  return errors
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