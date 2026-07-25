import Image from "next/image"

/**
 * Minimal conversion-focused header: logo only, no navigation.
 * Keeps the visitor's attention on the trial CTA.
 */
export function PrestonHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-center px-5 sm:justify-start">
        <Image
          src="/eatinout-logo.webp"
          alt="EatinOut"
          width={140}
          height={36}
          priority
          className="h-8 w-auto"
        />
      </div>
    </header>
  )
}
