import { createFileRoute } from '@tanstack/react-router'
import PulseDashboard from '@/pages/pulse'

export const Route = createFileRoute('/pulse')({
  component: PulseDashboard
})