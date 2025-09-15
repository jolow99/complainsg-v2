import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthPage } from '@/pages/auth'

export const Route = createFileRoute('/auth')({
  beforeLoad: ({ context }) => {
    // If user is already logged in, redirect to chat
    if (context.user) {
      throw redirect({
        to: '/chat',
      })
    }
  },
  component: AuthPage,
})