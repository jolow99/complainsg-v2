import { LogOut, BarChart3, User, Plus, MessageSquare, Settings } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { DarkModeToggle } from "@/components/DarkModeToggle"
import type { User as UserType } from "@/types/auth"

interface ChatHistoryItem {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
}

interface AppSidebarProps {
  user: UserType
  onLogout: () => void
  onGoPulse?: () => void
}

export function AppSidebar({ user, onLogout, onGoPulse }: AppSidebarProps) {
  const navigate = useNavigate()
  // Mock chat history data - replace with actual data later
  const chatHistory: ChatHistoryItem[] = [
    {
      id: '1',
      title: 'Road Pothole Issue',
      lastMessage: 'Thank you for the feedback...',
      timestamp: new Date('2024-01-15T10:30:00')
    },
    {
      id: '2',
      title: 'Public Transport Delay',
      lastMessage: 'I understand your concern...',
      timestamp: new Date('2024-01-14T15:45:00')
    },
    {
      id: '3',
      title: 'Park Maintenance',
      lastMessage: 'Let me help you with this...',
      timestamp: new Date('2024-01-13T09:20:00')
    }
  ]

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  // Get user initials for avatar fallback
  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenuButton
          onClick={() => navigate({ to: '/' })}
          className="flex items-center gap-2 px-4 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 hover:bg-sidebar-accent w-full"
          tooltip="Go to Home"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="text-sm font-semibold">CS</span>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">ComplainSG</span>
            <span className="text-xs text-sidebar-foreground/70">Complain Better</span>
          </div>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent>
        {/* New Chat Button */}
        <div className="p-2">
          <SidebarMenuButton
            className="w-full justify-center bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            tooltip="New Chat"
          >
            <Plus className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
          </SidebarMenuButton>
        </div>

        <SidebarSeparator />

        {/* Chat History */}
        <div className="flex-1 overflow-hidden">
          <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
            <h3 className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-2">
              Recent Chats
            </h3>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-16rem)]">
            <SidebarMenu>
              {chatHistory.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={chat.title}
                    className="h-auto py-2 px-2"
                  >
                    <a href="#" className="flex flex-col items-start gap-1 w-full">
                      <div className="flex items-center gap-2 w-full">
                        <MessageSquare className="h-3 w-3 flex-shrink-0" />
                        <span className="text-sm font-medium truncate group-data-[collapsible=icon]:hidden">
                          {chat.title}
                        </span>
                      </div>
                      <div className="text-xs text-sidebar-foreground/60 truncate w-full group-data-[collapsible=icon]:hidden">
                        {chat.lastMessage}
                      </div>
                      <div className="text-xs text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
                        {formatTimestamp(chat.timestamp)}
                      </div>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </div>

        <SidebarSeparator />

        {/* Go to Pulse Button */}
        <div className="p-2">
          <SidebarMenuButton
            onClick={onGoPulse}
            className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
            tooltip="Go to Pulse"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Go to Pulse</span>
          </SidebarMenuButton>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Dark Mode Toggle - positioned above user profile */}
        <div className="px-2 py-1 flex justify-end group-data-[collapsible=icon]:justify-center">
          <DarkModeToggle />
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                      {getUserInitials(user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user.email.split('@')[0]}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {user.email}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/50">
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getUserInitials(user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.email.split('@')[0]}
                      </span>
                      <span className="truncate text-xs">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}