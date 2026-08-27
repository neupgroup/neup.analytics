import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/component/ui/card';
import { Users, ShoppingCart, CreditCard, PartyPopper, Bot } from 'lucide-react';

const funnelSteps = [
    { icon: Users, name: "Viewed Product", count: "10,000", dropoff: null, conversion: "100%" },
    { icon: ShoppingCart, name: "Added to Cart", count: "2,500", dropoff: "75%", conversion: "25%" },
    { icon: CreditCard, name: "Started Checkout", count: "1,500", dropoff: "40%", conversion: "15%" },
    { icon: PartyPopper, name: "Purchased", count: "1,200", dropoff: "20%", conversion: "12%" },
]

export function FunnelAnalysis() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-lg">Purchase Funnel</CardTitle>
        <CardDescription>Conversion rates through the checkout process.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            {funnelSteps.map((step, index) => (
                <div key={step.name}>
                    {index > 0 && (
                        <div className="ml-5 h-6 border-l-2 border-dashed border-border" />
                    )}
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <step.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">{step.name}</p>
                            <p className="text-sm text-muted-foreground">{step.count} users</p>
                        </div>
                        <div className="text-right">
                           <p className="font-bold">{step.conversion}</p>
                           {step.dropoff && <p className="text-xs text-destructive">-{step.dropoff} drop</p>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="rounded-lg border bg-accent/30 p-3">
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 flex-shrink-0 text-primary mt-1" />
            <div>
              <p className="text-sm font-semibold">AI Suggestion</p>
              <p className="text-sm text-muted-foreground">Create a new funnel to track users who add items to the cart but abandon checkout on the shipping page. This could reveal issues with shipping costs.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
