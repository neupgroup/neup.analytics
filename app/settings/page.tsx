import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Settings</CardTitle>
                    <CardDescription>This is a placeholder for the Settings page. Manage your account, workspace, and tracking settings here.</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
                    <Settings className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-bold font-headline mb-2">Application Settings</h3>
                    <p>This feature is under construction.</p>
                </CardContent>
            </Card>
        
    );
}
