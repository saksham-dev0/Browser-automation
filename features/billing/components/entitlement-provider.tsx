"use client"

import { createContext, use } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { Entitlement } from "@/features/billing/lib/entitlement"

const EntitlementContext = createContext<Entitlement | null>(null)

/**
 * Publishes the org's entitlement to the dashboard's client tree. Mounted in
 * the dashboard layout so any client component can gate on the plan without
 * threading props or re-querying.
 */
export function EntitlementProvider({
  entitlement,
  children,
}: {
  entitlement: Entitlement
  children: React.ReactNode
}) {
  return (
    <EntitlementContext value={entitlement}>{children}</EntitlementContext>
  )
}

export function useEntitlement() {
  const entitlement = use(EntitlementContext)

  if (!entitlement) {
    throw new Error("useEntitlement must be used inside an EntitlementProvider")
  }

  return entitlement
}

/**
 * The pro gate. `requirePro` returns whether the action may proceed and, when
 * it may not, explains why and sends the user to the billing page.
 *
 * This gates the UI only — anything that costs money must be re-checked on the
 * server, where the plan cannot be forged.
 */
export function useProGate() {
  const entitlement = useEntitlement()
  const router = useRouter()

  const requirePro = (feature: string) => {
    if (entitlement.isPro) return true

    toast.error(`${feature} is a Pro feature.`, {
      action: { label: "Upgrade", onClick: () => router.push("/billing") },
    })

    return false
  }

  return { isPro: entitlement.isPro, requirePro }
}
