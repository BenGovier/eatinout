"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Tags, Store, Link2, TrendingUp } from "lucide-react"

interface StatsCardsProps {
  totalTags: number
  tagsWithRestaurants: number
  totalAssociations: number
  avgPerTag: string
}

const stats = [
  { key: "totalTags", label: "Total Tags", icon: Tags },
  { key: "tagsWithRestaurants", label: "Tags with Restaurants", icon: Store },
  { key: "totalAssociations", label: "Total Associations", icon: Link2 },
  { key: "avgPerTag", label: "Avg per Tag", icon: TrendingUp },
] as const

export function StatsCards({
  totalTags,
  tagsWithRestaurants,
  totalAssociations,
  avgPerTag,
}: StatsCardsProps) {
  const values: Record<string, string | number> = {
    totalTags,
    tagsWithRestaurants,
    totalAssociations,
    avgPerTag,
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.key} className="border border-border bg-card">
          <CardContent className="flex flex-col gap-1 p-5">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {values[stat.key]}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
