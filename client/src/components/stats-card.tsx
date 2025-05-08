import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare, Clock, CheckSquareIcon, AlertTriangle } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: "total" | "completed" | "in-progress" | "overdue";
}

export function StatsCard({ title, value, icon }: StatsCardProps) {
  const getIconComponent = () => {
    switch (icon) {
      case "total":
        return <CheckSquare className="text-xl text-blue-600 dark:text-blue-400" />;
      case "completed":
        return <CheckSquareIcon className="text-xl text-green-600 dark:text-green-400" />;
      case "in-progress":
        return <Clock className="text-xl text-amber-600 dark:text-amber-400" />;
      case "overdue":
        return <AlertTriangle className="text-xl text-red-600 dark:text-red-400" />;
      default:
        return <CheckSquare className="text-xl text-blue-600 dark:text-blue-400" />;
    }
  };

  const getIconBgColor = () => {
    switch (icon) {
      case "total":
        return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300";
      case "in-progress":
        return "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300";
      case "overdue":
        return "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300";
      default:
        return "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300";
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${getIconBgColor()}`}>
            {getIconComponent()}
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
