import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ChatPage } from '@/pages/chat'
import { MainLayout } from '@/layout/MainLayout'

type ChatSearch = {
  conversation?: string
}

export const Route = createFileRoute('/chat')({
  validateSearch: (search: Record<string, unknown>): ChatSearch => {
    return {
      conversation: typeof search.conversation === 'string' ? search.conversation : undefined,
    }
  },
  beforeLoad: ({ context }) => {
    // If user is not logged in, redirect to auth
    if (!context.user) {
      throw redirect({
        to: '/auth',
      })
    }
  },
  component: Chat,
})

function Chat() {
  const navigate = useNavigate()
  const { user } = Route.useRouteContext()
  const { conversation: conversationId } = Route.useSearch()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate({ to: '/' })
    window.location.reload()
  }

  const handleGoPulse = () => {
    // Placeholder for pulse navigation - implement when pulse is ready
    alert('Pulse analytics platform coming soon!')
  }

  // user is guaranteed to exist here due to beforeLoad check
  if (!user) return null

  return (
    <MainLayout user={user} onLogout={handleLogout} onGoPulse={handleGoPulse}>
      <ChatPage conversationId={conversationId} />
    </MainLayout>
  )
}