import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <Card className="border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-3xl font-semibold text-foreground">
              {value}
            </p>
          </div>

          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
