import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden border shadow-none!">{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
