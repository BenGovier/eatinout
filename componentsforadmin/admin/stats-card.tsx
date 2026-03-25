import { Card, CardContent } from "@componentsforadmin/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
}

export function StatsCard({ title, value }: StatsCardProps) {
  return (
    <Card className="border border-border">
      <CardContent className="pt-4 pb-6 px-5">
        <p className="text-sm text-muted-foreground mb-2">{title}</p>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
