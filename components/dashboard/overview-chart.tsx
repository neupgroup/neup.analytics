'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@neup/components/ui/chart'

const chartData = [
  { month: 'January', users: 1860 },
  { month: 'February', users: 3050 },
  { month: 'March', users: 2370 },
  { month: 'April', users: 2730 },
  { month: 'May', users: 2090 },
  { month: 'June', users: 2140 },
  { month: 'July', users: 3150 },
  { month: 'August', users: 2890 },
  { month: 'September', users: 3400 },
  { month: 'October', users: 3800 },
  { month: 'November', users: 4100 },
  { month: 'December', users: 4500 },
]

const chartConfig = {
  users: {
    label: 'Users',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig

export function OverviewChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
         <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value / 1000}K`}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="users" fill="var(--color-users)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
