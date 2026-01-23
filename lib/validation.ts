import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов')
})

export const registerSchema = z.object({
  email: z.string().email('Неверный формат email'),
  username: z.string().min(3, 'Имя пользователя должно содержать минимум 3 символа').optional(),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  confirmPassword: z.string().min(6, 'Пароль должен содержать минимум 6 символов')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"]
})