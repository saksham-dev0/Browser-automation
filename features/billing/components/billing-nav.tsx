"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditCardIcon } from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function BillingNav() {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname === "/billing"} tooltip="Billing">
          <Link href="/billing">
            <CreditCardIcon />
            <span>Billing</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
