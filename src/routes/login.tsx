import { createFileRoute } from '@tanstack/react-router'

import { EmailPasswordAuthScreen } from '#/features/auth-email-password'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return <EmailPasswordAuthScreen />
}
