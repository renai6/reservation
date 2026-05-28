'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth'
import { logger } from '@/lib/logger'

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  }
}

export async function registerAction(prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email and password are required' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return { error: 'Email already registered' }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, password: hashed } })

    const token = await signToken({ userId: user.id, email: user.email })
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, cookieOptions())

    logger.info('auth.registered', { userId: user.id, email })
  } catch (err) {
    logger.error('auth.register.error', { error: String(err), email })
    return { error: 'Registration failed. Please try again.' }
  }

  redirect('/seats')
}

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const from = (formData.get('from') as string) || '/seats'

  if (!email || !password) return { error: 'Email and password are required' }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      logger.warn('auth.login.not_found', { email })
      return { error: 'Invalid credentials' }
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      logger.warn('auth.login.bad_password', { email })
      return { error: 'Invalid credentials' }
    }

    const token = await signToken({ userId: user.id, email: user.email })
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, cookieOptions())

    logger.info('auth.login', { userId: user.id, email })
  } catch (err) {
    logger.error('auth.login.error', { error: String(err), email })
    return { error: 'Login failed. Please try again.' }
  }

  redirect(from)
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/')
}
