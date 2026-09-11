"use client"

import { useTransition } from "react"
import { format } from "date-fns"
import { ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"

import { openBillingPortalAction } from "@/features/billing/actions"
import type { Entitlement } from "@/features/billing/lib/entitlement"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Dodo statuses, phrased for a customer rather than an integrator. */
const STATUS_LABELS: Record<string, string> = {
  pending: "Starting",
  active: "Active",
  renewed: "Active",
  past_due: "Payment overdue",
  on_hold: "Payment failed",
  paused: "Paused",
  cancelled: "Cancelled",
  failed: "Payment failed",
  expired: "Expired",
}

function statusVariant(entitlement: Entitlement) {
  if (entitlement.needsAttention) return "destructive" as const
  return entitlement.isPro ? ("default" as const) : ("outline" as const)
}

function renewalNote(entitlement: Entitlement) {
  if (!entitlement.currentPeriodEnd) return null

  const date = format(entitlement.currentPeriodEnd, "MMMM d, yyyy")

  if (entitlement.cancelAtPeriodEnd) return `Access ends on ${date}`
  if (entitlement.needsAttention) return `Retrying payment until ${date}`

  return `Renews on ${date}`
}

export function SubscriptionSummary({
  entitlement,
  canManage,
}: {
  entitlement: Entitlement
  canManage: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const handleManage = () => {
    startTransition(async () => {
      try {
        // Redirects to Dodo's hosted portal; the NEXT_REDIRECT rejection is
        // the router's to handle, so it must escape this catch.
        await openBillingPortalAction()
      } catch (error) {
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
          throw error
        }
        toast.error(
          error instanceof Error ? error.message : "Could not open the portal"
        )
      }
    })
  }

  const note = renewalNote(entitlement)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {entitlement.plan.name} plan
          {entitlement.status ? (
            <Badge variant={statusVariant(entitlement)}>
              {STATUS_LABELS[entitlement.status] ?? entitlement.status}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          {note ?? "You're on the free plan. Upgrade whenever you're ready."}
        </CardDescription>
        {entitlement.status ? (
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending || !canManage}
              onClick={handleManage}
            >
              Manage subscription
              <ExternalLinkIcon />
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      {entitlement.needsAttention ? (
        <CardContent>
          <p className="text-sm text-destructive">
            We couldn&apos;t charge your payment method. Update it in the billing
            portal to keep your subscription active.
          </p>
        </CardContent>
      ) : null}
    </Card>
  )
}
