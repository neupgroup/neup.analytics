import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/component/ui/card";
import { LineChart } from "lucide-react";

export default function ReportsPage() {
    return (
        
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Custom Reports</CardTitle>
                    <CardDescription>This is a placeholder for the customizable reports feature. Build, save, and share your own dashboards.</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
                    <LineChart className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-bold font-headline mb-2">Report Builder</h3>
                    <p>This feature is under construction.</p>
                </CardContent>
            </Card>
        
    );
}
