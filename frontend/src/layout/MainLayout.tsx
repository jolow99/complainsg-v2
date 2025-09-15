import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import type { User } from "@/types/auth"

interface MainLayoutProps {
  user: User
  onLogout: () => void
  children: React.ReactNode
}

export function MainLayout({ user, onLogout, children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} onLogout={onLogout} />
      <SidebarInset>
        <div className="flex h-screen flex-col">
          {/* Header with sidebar trigger */}
          <header className="flex h-16 shrink-0 items-center border-b px-4">
            <SidebarTrigger />
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}