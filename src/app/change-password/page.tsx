import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import PasswordChangeForm from './PasswordChangeForm'

export default async function ChangePasswordPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.mustChangePassword) redirect('/overview')
  return <PasswordChangeForm />
}
