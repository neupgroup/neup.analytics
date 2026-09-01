import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import { Bot } from 'lucide-react';

export function AutomatedReport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          <span>Weekly Insights</span>
        </CardTitle>
        <CardDescription>AI-Generated Executive Summary</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        <p>
          Traffic is up <span className="font-semibold text-foreground">12%</span> this week, driven by the new marketing campaign. However, mobile retention has dropped by <span className="font-semibold text-destructive">3%</span>. We recommend investigating the mobile app's new onboarding flow.
        </p>
      </CardContent>
    </Card>
  );
}
