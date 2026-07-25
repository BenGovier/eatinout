"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useMotionValue, animate } from "framer-motion"

interface Stat {
  prefix?: string
  value: number
  suffix?: string
  label: string
  /** Render the value literally instead of counting (e.g. "30 Days") */
  display?: string
}

const stats: Stat[] = [
  { value: 500, suffix: "+", label: "Restaurant Offers" },
  { prefix: "Up to ", value: 50, suffix: "%", label: "Savings" },
  { value: 30, suffix: " Days", label: "FREE Trial" },
]

function Counter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const count = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, value, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.floor(v)),
    })
    return () => controls.stop()
  }, [inView, value, count])

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

export function PrestonStats() {
  return (
    <section className="bg-[var(--eo-bg)] py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-8 rounded-3xl bg-white p-10 shadow-sm ring-1 ring-black/5 sm:grid-cols-3 sm:p-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl font-extrabold tracking-tight text-[var(--eo-red)] sm:text-5xl">
                <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-[var(--eo-muted)]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
