import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: string | number;
    isUpward: boolean;
  };
  className?: string;
  iconClassName?: string;
  iconContainerClassName?: string;
}

export function StatsCard({ 
  title, 
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconClassName,
  iconContainerClassName
}: StatsCardProps) {
  return (
    <Card className={cn(
      "hover:shadow-md transition-all duration-300 overflow-hidden group",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-60"></div>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-3xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <span className={`${trend.isUpward ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium flex items-center mr-2`}>
                  {trend.isUpward ? '↑' : '↓'} {trend.value}
                </span>
                since last period
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300",
              iconContainerClassName
            )}>
              <Icon className={cn("h-6 w-6", iconClassName)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
