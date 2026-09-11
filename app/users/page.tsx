import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@neup/components/ui/card";
import { Users } from "lucide-react";

export default function UsersPage() {
    return (
        
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Users &amp; Segments</CardTitle>
                    <CardDescription>This is a placeholder for the User Segmentation feature. Analyze and filter users based on various criteria.</CardDescription>
                </CardHeader>
                <CardContent className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
                    <Users className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-bold font-headline mb-2">User Segmentation Engine</h3>
                    <p>This feature is under construction.</p>
                </CardContent>
            </Card>
        
    );
}
