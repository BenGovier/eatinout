import Image from "next/image"
import Link from "next/link"
import { ArrowRight, UserCheck } from "lucide-react"

type SignedInNoticeProps = {
  email: string
  returnUrl: string
}

export function SignedInNotice({ email, returnUrl }: SignedInNoticeProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      <header className="flex items-center">
        <Link href="/" aria-label="EatinOut home">
          <Image src="/eatinout-logo.webp" alt="EatinOut" width={160} height={40} className="h-8 w-auto sm:h-9" priority />
        </Link>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl bg-[#FFFDFB] p-6 shadow-sm ring-1 ring-[#EFE7DF] sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF4EC]">
          <UserCheck className="h-6 w-6 text-[#1F5A3A]" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A] text-balance">{"You're already signed in"}</h1>
        <p className="text-base leading-relaxed text-[#5C5650]">
          {"You're signed in as "}
          <span className="font-semibold text-[#1A1A1A] break-all">{email}</span>
          {". You don't need another account. Your membership options are in your account."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={returnUrl}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#EB221C] px-6 font-semibold text-white hover:bg-[#D11D17]"
          >
            Continue to offers
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link
            href="/account"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-[#D9D2CA] bg-[#FFFCF9] px-6 font-semibold text-[#1A1A1A] hover:border-[#1F5A3A]"
          >
            Go to my account
          </Link>
        </div>
      </section>
    </div>
  )
}
