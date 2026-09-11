import { Avatar, AvatarFallback, AvatarImage } from '@neup/components/ui/avatar';
import { Button } from '@neup/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@neup/components/ui/card';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '@neup/components/ui/link';

const activities = [
    { id: 1, user: { name: 'Olivia Martin', avatarSeed: 'olivia' }, action: 'completed a purchase.', details: 'Source: Paid Ad on Facebook', time: '5m ago' },
    { id: 2, user: { name: 'Jackson Lee', avatarSeed: 'jackson' }, action: 'started a session.', details: 'Location: London, UK', time: '12m ago' },
    { id: 3, user: { name: 'Isabella Nguyen', avatarSeed: 'isabella' }, action: 'viewed the pricing page.', details: 'Device: iPhone 15 Pro', time: '23m ago' },
    { id: 4, user: { name: 'William Kim', avatarSeed: 'william' }, action: 'triggered a JS error.', details: 'page: /checkout', time: '30m ago' },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle className="font-headline text-lg">Recent Activity</CardTitle>
          <CardDescription>
            A feed of the latest user interactions.
          </CardDescription>
        </div>
        <Link variant="plain" size="sm" className="ml-auto gap-1" href="/live">
            Live View
            <ArrowUpRight className="h-4 w-4" />
          </Link>
      </CardHeader>
      <CardContent className="grid gap-6">
        {activities.map(activity => (
             <div key={activity.id} className="flex items-center gap-4">
             <Avatar className="h-9 w-9">
               <AvatarImage data-ai-hint="person face" src={`https://picsum.photos/seed/${activity.user.avatarSeed}/36/36`} alt="Avatar" />
               <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
             </Avatar>
             <div className="grid gap-1">
               <p className="text-sm font-medium leading-none">
                 <span className="font-semibold">{activity.user.name}</span> {activity.action}
               </p>
               <p className="text-sm text-muted-foreground">
                 {activity.details}
               </p>
             </div>
             <div className="ml-auto text-sm text-muted-foreground">{activity.time}</div>
           </div>
        ))}
      </CardContent>
    </Card>
  );
}
