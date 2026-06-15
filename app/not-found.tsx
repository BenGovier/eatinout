import Link from "next/link"
import { MapPin, UtensilsCrossed } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#FFFBF7] px-4 py-8">
      {/* Oversized decorative 404 in the background */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center font-bold leading-none text-foreground/[0.035]"
      >
        <span className="text-[40vw] sm:text-[28rem]">404</span>
      </span>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center">
          <Logo href="/" className="inline-flex" />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {/* Food-themed graphic treatment */}
          <div className="flex justify-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <UtensilsCrossed
                className="h-8 w-8 text-primary"
                aria-hidden="true"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-foreground"
              >
                <MapPin className="h-3.5 w-3.5 text-background" />
              </span>
            </div>
          </div>

          <h1 className="mt-5 text-balance text-center text-2xl font-bold leading-tight text-foreground">
            Looks like this table is no longer available
          </h1>
          <p className="mt-3 text-pretty text-center text-base leading-relaxed text-muted-foreground">
            The page you&apos;re looking for may have moved, expired or no longer
            exists.
          </p>

          {/* Primary + secondary actions */}
          <div className="mt-6 flex flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="w-full rounded-full bg-primary py-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/restaurants">Browse restaurants</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full rounded-full text-base font-medium text-foreground/80 hover:bg-secondary hover:text-foreground"
            >
              <Link href="/">Go back home</Link>
            </Button>
          </div>
        </div>

        {/* Non-intrusive membership prompt */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Ready to start saving when you eat out?
          </p>
          <Link
            href="/sign-up"
            className="mt-1 inline-block rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            View membership options
          </Link>
        </div>
      </div>
    </main>
  )
}
