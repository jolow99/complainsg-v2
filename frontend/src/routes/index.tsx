import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LandingPage } from '@/pages/landing'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate({ to: '/auth' })
  }

  const handleExplorePulse = () => {
    // For now, just redirect to get started - you can implement pulse later
    navigate({ to: '/auth' })
  }

  return (
    <LandingPage
      onGetStarted={handleGetStarted}
      onExplorePulse={handleExplorePulse}
    />
  )
}