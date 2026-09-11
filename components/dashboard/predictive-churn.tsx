import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@neup/components/ui/card';
import { UserX } from 'lucide-react';
import { ProgressBar } from '@neup/components/element/progressbar';

export function PredictiveChurn() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-lg">
          <UserX className="h-5 w-5 text-primary" />
          <span>Predictive Churn</span>
        </CardTitle>
        <CardDescription>Users at high risk of churning this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="flex items-center">
            <p className="text-sm font-medium">High-Risk Users</p>
            <p className="text-lg font-bold font-headline ml-auto">1,204</p>
        </div>
        <ProgressBar value={28} aria-label="28% churn risk" />
        <p className="text-xs text-muted-foreground">
            <span className="font-bold text-destructive">28%</span> of power users are showing signs of disengagement.
        </p>
      </CardContent>
    </Card>
  );
}
