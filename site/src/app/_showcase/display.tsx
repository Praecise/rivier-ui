// Showcase: display components.

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Stat } from "@/components/ui/stat";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Demo } from "./demo";

const ROWS = [
  { name: "Example Studio", plan: "Team", seats: 12, status: "Active" },
  { name: "Example Bakery", plan: "Solo", seats: 1, status: "Trial" },
  { name: "Example Travel", plan: "Company", seats: 48, status: "Active" },
] as const;

export function Display() {
  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Card">
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Example figures, this month</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={62} aria-label="Usage" />
            <p className="mt-2 text-sm text-muted-foreground">62% of the plan used</p>
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">
              Details
            </Button>
          </CardFooter>
        </Card>
      </Demo>

      <Demo title="Stat">
        <div className="grid gap-3 @sm:grid-cols-2">
          <Stat label="Visitors" value="12,480" change="8.2%" direction="up" tone="positive" changeLabel="than last month" />
          <Stat label="Errors" value="31" change="4" direction="down" tone="positive" changeLabel="than last week" />
        </div>
      </Demo>

      <Demo title="Badge, avatar, kbd">
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge>Solid</Badge>
            <Badge variant="soft">Soft</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success" dot>
              Live
            </Badge>
            <Badge variant="warning">Review</Badge>
            <Badge variant="destructive">Failed</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <AvatarGroup>
              <Avatar>
                <AvatarFallback>AK</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>HM</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>RW</AvatarFallback>
              </Avatar>
            </AvatarGroup>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
            <Spinner />
          </div>
          <Separator>or</Separator>
          <div className="grid gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Progress aria-label="Loading" />
          </div>
        </div>
      </Demo>

      <Demo title="Alert and empty state">
        <div className="grid gap-3">
          <Alert variant="info">
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>Billing moves to the first of the month.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Payment failed</AlertTitle>
            <AlertDescription>Update the card to keep the site online.</AlertDescription>
          </Alert>
          <EmptyState bordered title="No projects yet" description="Create one to see it here." action={<Button size="sm">New project</Button>} />
        </div>
      </Demo>

      <Demo title="Table" className="@3xl:col-span-2">
        <Table>
          <TableCaption>Example rows, not real customers.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead numeric>Seats</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.name}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.plan}</TableCell>
                <TableCell numeric>{row.seats}</TableCell>
                <TableCell>
                  <Badge variant={row.status === "Active" ? "success" : "soft"}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Demo>
    </div>
  );
}
