"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CalendarCheck,
  ShieldCheck,
  CircleSlash,
  Loader2,
} from "lucide-react";
import {
  type NormalizedSubscription,
  formatUKDate,
  daysRemainingLabel,
  billingCadence,
} from "@/lib/subscription";

interface Props {
  subscription: NormalizedSubscription | null;
  /** Show the "Manage membership" secondary action (hidden on the payment page itself). */
  showManage?: boolean;
  onExplore?: () => void;
  onManage?: () => void;
  onKeepMembership?: () => void;
  onRestart?: () => void;
  reactivating?: boolean;
}

type Tone = "trial" | "active" | "scheduled" | "inactive";

const toneStyles: Record<
  Tone,
  { border: string; eyebrow: string; icon: string; iconBg: string }
> = {
  trial: {
    border: "border-l-4 border-l-primary",
    eyebrow: "text-primary",
    icon: "text-primary",
    iconBg: "bg-primary/10",
  },
  active: {
    border: "border-l-4 border-l-emerald-500",
    eyebrow: "text-emerald-600",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
  },
  scheduled: {
    border: "border-l-4 border-l-amber-500",
    eyebrow: "text-amber-600",
    icon: "text-amber-600",
    iconBg: "bg-amber-500/10",
  },
  inactive: {
    border: "border-l-4 border-l-muted-foreground/40",
    eyebrow: "text-muted-foreground",
    icon: "text-muted-foreground",
    iconBg: "bg-muted",
  },
};

export function SubscriptionSummaryCard({
  subscription,
  showManage = true,
  onExplore,
  onManage,
  onKeepMembership,
  onRestart,
  reactivating = false,
}: Props) {
  const sub = subscription;
  const status = sub?.effectiveStatus ?? "inactive";

  // ----- Trial -----
  if (sub && sub.isTrialing && status !== "scheduled_cancellation") {
    const t = toneStyles.trial;
    const price = sub.formattedRecurringAmount ?? "";
    const date = formatUKDate(sub.trialEnd);
    return (
      <CardShell tone={t}>
        <Eyebrow tone={t} icon={<Sparkles className="h-4 w-4" />}>
          Free trial active
        </Eyebrow>
        <h2 className="text-xl font-bold text-foreground text-balance">Your 30-day free trial</h2>
        <p className="text-sm font-medium text-foreground/80 mt-1">
          {daysRemainingLabel(sub.trialEnd)}
        </p>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {price && date
            ? `Your first payment of ${price} will be taken on ${date}.`
            : "You won't be charged until your trial ends."}
        </p>
        <Actions>
          {onExplore && (
            <Button onClick={onExplore} className="flex-1 sm:flex-none">
              Explore restaurants
            </Button>
          )}
          {showManage && onManage && (
            <Button variant="outline" onClick={onManage} className="flex-1 sm:flex-none">
              Manage membership
            </Button>
          )}
        </Actions>
      </CardShell>
    );
  }

  // ----- Scheduled cancellation -----
  if (sub && status === "scheduled_cancellation") {
    const t = toneStyles.scheduled;
    const date = formatUKDate(sub.accessEndDate);
    return (
      <CardShell tone={t}>
        <Eyebrow tone={t} icon={<CalendarCheck className="h-4 w-4" />}>
          Cancellation scheduled
        </Eyebrow>
        <h2 className="text-xl font-bold text-foreground text-balance">
          Your membership remains active
        </h2>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {date
            ? `You can continue using EatinOut until ${date}. You won't be charged again after this date.`
            : "You can continue using EatinOut until the end of your current period."}
        </p>
        <Actions>
          {sub.canReactivate && onKeepMembership && (
            <Button onClick={onKeepMembership} disabled={reactivating} className="flex-1 sm:flex-none">
              {reactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reactivating
                </>
              ) : (
                "Keep my membership"
              )}
            </Button>
          )}
          {showManage && onManage && (
            <Button variant="outline" onClick={onManage} className="flex-1 sm:flex-none">
              Manage membership
            </Button>
          )}
        </Actions>
      </CardShell>
    );
  }

  // ----- Cancelled but access remains (legacy cancelled_with_access) -----
  if (sub && status === "cancelled_with_access") {
    const t = toneStyles.scheduled;
    const date = formatUKDate(sub.accessEndDate);
    return (
      <CardShell tone={t}>
        <Eyebrow tone={t} icon={<CalendarCheck className="h-4 w-4" />}>
          Membership ending
        </Eyebrow>
        <h2 className="text-xl font-bold text-foreground text-balance">
          Your access is ending soon
        </h2>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {date
            ? `You can continue using EatinOut until ${date}. You won't be charged again.`
            : "You can continue using EatinOut until the end of your current period."}
        </p>
        <Actions>
          {sub.canReactivate && onKeepMembership && (
            <Button onClick={onKeepMembership} disabled={reactivating} className="flex-1 sm:flex-none">
              {reactivating ? "Reactivating" : "Keep my membership"}
            </Button>
          )}
          {status === "cancelled_with_access" && !sub.canReactivate && onRestart && (
            <Button onClick={onRestart} className="flex-1 sm:flex-none">
              Restart membership
            </Button>
          )}
          {showManage && onManage && (
            <Button variant="outline" onClick={onManage} className="flex-1 sm:flex-none">
              Manage membership
            </Button>
          )}
        </Actions>
      </CardShell>
    );
  }

  // ----- Active paid -----
  if (sub && (status === "active" || status === "past_due") && sub.hasAccess) {
    const t = toneStyles.active;
    const cadence = billingCadence(sub.billingInterval, sub.billingIntervalCount);
    const price = sub.formattedRecurringAmount ?? "";
    const nextDate = formatUKDate(sub.currentPeriodEnd);
    return (
      <CardShell tone={t}>
        <Eyebrow tone={t} icon={<ShieldCheck className="h-4 w-4" />}>
          Active membership
        </Eyebrow>
        <h2 className="text-xl font-bold text-foreground text-balance">{sub.planName}</h2>
        {price && (
          <p className="text-sm font-medium text-foreground/80 mt-1">
            {price} {cadence}
          </p>
        )}
        {nextDate && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Next payment: {nextDate}
          </p>
        )}
        <Actions>
          {onExplore && (
            <Button onClick={onExplore} className="flex-1 sm:flex-none">
              Explore restaurants
            </Button>
          )}
          {showManage && onManage && (
            <Button variant="outline" onClick={onManage} className="flex-1 sm:flex-none">
              Manage membership
            </Button>
          )}
        </Actions>
      </CardShell>
    );
  }

  // ----- Inactive / cancelled (no access) -----
  const t = toneStyles.inactive;
  return (
    <CardShell tone={t}>
      <Eyebrow tone={t} icon={<CircleSlash className="h-4 w-4" />}>
        Membership inactive
      </Eyebrow>
      <h2 className="text-xl font-bold text-foreground text-balance">
        Your membership is inactive
      </h2>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
        Restart your membership to unlock member-only restaurant discounts again.
      </p>
      <Actions>
        {onRestart && (
          <Button onClick={onRestart} className="flex-1 sm:flex-none">
            Restart membership
          </Button>
        )}
      </Actions>
    </CardShell>
  );
}

function CardShell({
  tone,
  children,
}: {
  tone: { border: string };
  children: React.ReactNode;
}) {
  return <Card className={`p-5 sm:p-6 ${tone.border}`}>{children}</Card>;
}

function Eyebrow({
  tone,
  icon,
  children,
}: {
  tone: { eyebrow: string; icon: string; iconBg: string };
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${tone.iconBg} ${tone.icon}`}>
        {icon}
      </span>
      <span className={`text-xs font-semibold uppercase tracking-wide ${tone.eyebrow}`}>
        {children}
      </span>
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex flex-col sm:flex-row gap-2">{children}</div>;
}
