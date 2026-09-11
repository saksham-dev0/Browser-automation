"use client"

import { useTransition } from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { startCheckoutAction } from "@/features/billing/actions"
import type { Plan, PlanId } from "@/features/billing/plans"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PlanCard({
  plan,
  isCurrent,
  canManage,
}: {
  plan: Plan
  isCurrent: boolean
  canManage: boolean
}) {
  const [isPending, startTransition] = useTransition()

  const handleUpgrade = () => {
    startTransition(async () => {
      try {
        // Redirects to Dodo's hosted checkout. The redirect rejects with a
        // NEXT_REDIRECT error the router handles, so it must escape this catch.
        await startCheckoutAction(plan.id as PlanId)
      } catch (error) {
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
          throw error
        }
        toast.error(
          error instanceof Error ? error.message : "Could not start checkout"
        )
      }
    })
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {plan.name}
          {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
        </CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight">
            {plan.price}
          </span>
          <span className="text-sm text-muted-foreground">{plan.interval}</span>
        </p>
        <ul className="flex flex-col gap-2">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-foreground" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      {plan.productId ? (
        <CardFooter>
          <Button
            className="w-full"
            disabled={isCurrent || isPending || !canManage}
            onClick={handleUpgrade}
          >
            {isCurrent ? "Current plan" : `Upgrade to ${plan.name}`}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}
