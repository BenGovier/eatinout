import Image from "next/image"
import Link from "next/link"
import { PrestonCtaButton } from "@/components/prestonblog/preston-cta-button"

/**
 * Final CTA over a second lifestyle photograph, then minimal legal links.
 */
export function CampaignFinalCta() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/prestonblog/campaign/final-cta.png"
            alt="Friends toasting over a shared meal at a local restaurant"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>

        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--eo-teal)]">
            BlogPreston readers
          </span>
          <h2 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Ready to eat out for less?
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-white/85">
            Start your free trial today and discover local restaurant offers across Preston and Lancashire.
          </p>

          <div className="mt-8 w-full max-w-sm">
            <PrestonCtaButton label="Start my 30-day free trial" block />
          </div>

          <p className="mt-4 text-sm font-medium text-white/75">
            No charge today &bull; Cancel anytime &bull; Then £4.99/month
          </p>
        </div>
      </section>

      <footer className="bg-[var(--eo-ink)] py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-white/50 sm:flex-row sm:px-6 sm:text-left">
          <p>&copy; {new Date().getFullYear()} EatinOut</p>
          <nav className="flex items-center gap-5">
            <Link href="/terms" className="transition-colors hover:text-white/80">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white/80">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
