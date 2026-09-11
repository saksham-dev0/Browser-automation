import { auth } from "@clerk/nextjs/server"

import { AppSidebar } from "@/components/app-sidebar"
import { EntitlementProvider } from "@/features/billing/components/entitlement-provider"
import { getEntitlement, toEntitlement } from "@/features/billing/lib/entitlement"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { orgId } = await auth()
  // No active org yet (the org picker): treat as free rather than crashing the
  // shell — every page under here already handles the missing org itself.
  const entitlement = orgId ? await getEntitlement(orgId) : toEntitlement()

  return (
    <EntitlementProvider entitlement={entitlement}>
      <TooltipProvider>
        <SidebarProvider className="h-svh">
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden border shadow-none!">{children}</SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </EntitlementProvider>
  )
}
