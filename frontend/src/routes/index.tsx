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
    navigate({ to: '/pulse' })
  }

  return (
    <LandingPage
      onGetStarted={handleGetStarted}
      onExplorePulse={handleExplorePulse}
    />
  )
}