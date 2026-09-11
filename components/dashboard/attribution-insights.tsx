import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@neup/components/ui/card';

const attributionData = [
  { channel: 'Organic Search', value: 45, color: 'bg-chart-1' },
  { channel: 'Direct', value: 25, color: 'bg-chart-2' },
  { channel: 'Paid Ads', value: 20, color: 'bg-chart-3' },
  { channel: 'Referral', value: 10, color: 'bg-chart-4' },
];

export function AttributionInsights() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-lg">Attribution Model</CardTitle>
        <CardDescription>AI-weighted contribution to conversions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
          {attributionData.map((d) => (
            <div
              key={d.channel}
              className={d.color}
              style={{ width: `${d.value}%` }}
              title={`${d.channel}: ${d.value}%`}
              aria-label={`${d.channel}: ${d.value}%`}
            />
          ))}
        </div>
        <ul className="space-y-2 text-sm">
          {attributionData.map((d) => (
            <li key={d.channel} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${d.color}`} />
                <span>{d.channel}</span>
              </div>
              <span className="font-semibold">{d.value}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
