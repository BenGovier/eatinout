import Image from "next/image"
import Link from "next/link"

interface LogoProps {
  className?: string
  size?: "small" | "medium" | "large"
  href?: string
  signinLogo?: boolean
}

export function Logo({ className, size = "medium", href = "/", signinLogo = false }: LogoProps) {
  const sizes = {
    small: { width: 32, height: 32 },
    medium: { width: 150, height: 30 }, 
    large: { width: 60, height: 60 },
  }

  const { width, height } = sizes[size]

  return (
    <Link href={href} className={className}>
      <Image
        src={signinLogo ? "/images/eatinouticon.webp" : "/images/eatinoutlogo.webp"}
        alt="Eatinout Logo"
        width={ signinLogo ? 40 : width}
        height={ signinLogo ? 30 : height}
        className="h-auto"
        priority
      />
    </Link>
  )
}

