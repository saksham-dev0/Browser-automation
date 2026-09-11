import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

import { BillingNav } from "@/features/billing/components/billing-nav"
import { createWorkflowAction } from "@/features/workflows/actions"
import { WorkflowNav } from "@/features/workflows/components/workflow-nav"
import { listWorkflows } from "@/features/workflows/data"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { orgId } = await auth()
  const workflows = orgId ? await listWorkflows(orgId) : []

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="h-12 flex-row items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div className="min-w-0 group-data-[collapsible=icon]:hidden">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            afterLeaveOrganizationUrl="/"
            appearance={{
              elements: {
                rootBox: "min-w-0 group-data-[collapsible=icon]:!hidden",
                organizationSwitcherTrigger: "w-full justify-between"
              }
            }}
          />
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <WorkflowNav
          workflows={workflows}
          createWorkflowAction={createWorkflowAction}
        />
      </SidebarContent>
      <SidebarFooter className="gap-2 p-2 group-data-[collapsible=icon]:items-center">
        <BillingNav />
        <UserButton showName={false} />
      </SidebarFooter>
    </Sidebar>
  )
}
