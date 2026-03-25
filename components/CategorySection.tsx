"use client"

import type { ReactNode, memo } from "react"
import { memo as reactMemo } from "react"

interface CategorySectionProps {
  title: string
  subtitle?: string
  trustMicrocopy?: string
  children: ReactNode
  isPrimary?: boolean
  id?: string
}

export const CategorySection = reactMemo(function CategorySection({
  title,
  subtitle,
  trustMicrocopy,
  children,
  isPrimary = false,
  id,
}: CategorySectionProps) {
  // Hide section if children is null or empty
  if (!children) {
    return null
  }

  return (
    <section id={id} className="space-y-3 py-3 scroll-mt-[100px]">
      <div className="px-4">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
        {trustMicrocopy && <p className="text-gray-500 text-xs mt-1.5">{trustMicrocopy}</p>}
      </div>

      <div className="relative">
        <div
          className={`flex ${isPrimary ? "gap-4" : "gap-3.5"} overflow-x-auto pl-4 pr-8 pb-2 scrollbar-hide`}
          style={{ scrollSnapType: "x mandatory" }}
        >
          {children}
        </div>
      </div>
    </section>
  )
})