import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Play, Square } from "lucide-react";
import { DurationInput } from "@/components/duration-input";
import { EmptyState } from "@/components/empty-state";
import { HoursMeter } from "@/components/hours-meter";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, TASK_STATUSES } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatAmounts, formatDateTime, formatTimer } from "@/lib/format";
import { getOrganizationSettings } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Styleguide · Olifant Workboard" };

export default async function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  const settings = await getOrganizationSettings();
  const sample = formatDateTime("2026-10-06T12:05:00.000Z", settings.timeZone);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Development"
        title="Styleguide"
        action={<Button>Approve All Remaining</Button>}
      />
      <p className="max-w-xl text-body-sm text-muted-foreground">
        Every shared component, for comparison with the design preview. Product screens keep a
        single primary button. This page is not available in production.
      </p>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Timer bar</h2>
        <div className="flex h-10 max-w-md items-center gap-3 rounded-full bg-secondary pr-1 pl-4 text-secondary-foreground shadow-md">
          <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="eyebrow text-neutral-300!">Website</span>
          <span className="min-w-0 flex-1 truncate text-body-xs">Rebuild pricing page</span>
          <span className="font-mono text-body-sm numeric">{formatTimer(5025)}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon-sm" className="hover:bg-yellow-200! hover:text-neutral-900!" aria-label="Stop timer">
                  <Square />
                </Button>
              }
            />
            <TooltipContent>Stop timer</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex h-10 max-w-md items-center gap-3 rounded-full bg-secondary pr-1 pl-4 text-secondary-foreground shadow-md">
          <span className="size-2 shrink-0 rounded-full bg-neutral-400" aria-hidden="true" />
          <span className="eyebrow text-neutral-300!">Paused</span>
          <span className="min-w-0 flex-1 truncate text-body-xs">Rebuild pricing page</span>
          <span className="font-mono text-body-sm numeric">{formatTimer(5025)}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="border-secondary-foreground! bg-transparent! text-secondary-foreground! hover:border-neutral-50! hover:bg-neutral-50! hover:text-neutral-900!"
                  aria-label="Continue timer"
                >
                  <Play />
                </Button>
              }
            />
            <TooltipContent>Share your screen to continue</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon-sm" className="hover:bg-yellow-200! hover:text-neutral-900!" aria-label="Stop timer">
                  <Square />
                </Button>
              }
            />
            <TooltipContent>Stop timer</TooltipContent>
          </Tooltip>
        </div>
        <p className="text-caption text-muted-foreground">
          Appearance only. The live bar shows in the top bar while a timer runs, and above the
          bottom edge on phones. While paused, Continue sits before Stop.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Approve All Remaining</Button>
          <Button className="bg-secondary text-secondary-foreground">Primary hover</Button>
          <Button
            className="outline-2 outline-offset-2 outline-neutral-900 shadow-[0_0_0_6px_var(--color-yellow-200)]"
          >
            Focused
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary">Submit Proposal</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button variant="outline">Request Changes</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Cancel Task</Button>
          <Button variant="link">View history</Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon" variant="outline" aria-label="More">
                  <Square />
                </Button>
              }
            />
            <TooltipContent>More</TooltipContent>
          </Tooltip>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Task status</h2>
        <div className="flex flex-wrap gap-2">
          {TASK_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge kind="extra-hours" status="pending" />
          <StatusBadge kind="extra-hours" status="approved" />
          <StatusBadge kind="extra-hours" status="rejected" />
          <StatusBadge kind="month" status="open" />
          <StatusBadge kind="month" status="closed" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Badges</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge size="sm" variant="brand">
            3
          </Badge>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard value="7" label="Waiting for a decision" />
        <StatCard value="142h" label="Counted this month" trend={{ direction: "up", label: "12%" }} />
        <StatCard
          values={formatAmounts([
            { cents: 624000, currency: "EUR" },
            { cents: 118000, currency: "USD" },
          ]).split(" · ")}
          label="Cost this month"
        />
        <StatCard value="3" label="Over limit" variant="brand" />
      </section>

      <section className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-heading-xs">Hours meter</h2>
        <HoursMeter countedMinutes={312} limitMinutes={480} ceilingMinutes={528} />
        <HoursMeter countedMinutes={400} limitMinutes={480} ceilingMinutes={528} />
        <HoursMeter countedMinutes={510} limitMinutes={480} ceilingMinutes={528} />
        <HoursMeter
          countedMinutes={570}
          limitMinutes={480}
          ceilingMinutes={528}
          requestHref="#extra-hours"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Table</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium" data-label="Task">
                Rebuild pricing page
              </TableCell>
              <TableCell data-label="Status">
                <StatusBadge status="in_progress" />
              </TableCell>
              <TableCell className="text-right numeric" data-label="Counted">
                8h 48m
              </TableCell>
              <TableCell className="text-right numeric" data-label="Amount">
                €352.00
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium" data-label="Task">
                Fix checkout bug
              </TableCell>
              <TableCell data-label="Status">
                <StatusBadge status="accepted" />
              </TableCell>
              <TableCell className="text-right numeric" data-label="Counted">
                1h 05m
              </TableCell>
              <TableCell className="text-right numeric" data-label="Amount">
                €43.33
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <DurationInput label="Duration" defaultValue="1:30" />
        <DurationInput label="Estimate" defaultValue="1h 20m" step={15} />
        <DurationInput label="Not a duration" defaultValue="nope" />
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Tabs</h2>
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
          <TabsContent value="open">Open months stay editable.</TabsContent>
          <TabsContent value="closed">Closed months are frozen.</TabsContent>
        </Tabs>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Dialog>
          <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save time</DialogTitle>
              <DialogDescription>Add a short description of the work.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">Discard</Button>
              <Button>Save Time</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger render={<Button variant="outline">Open sheet</Button>} />
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>The same navigation, below the large breakpoint.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline">Open menu</Button>} />
          <DropdownMenuContent>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Avatars</h2>
        <div className="flex items-end gap-3">
          <Avatar size="xs">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar size="xl">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Loading</h2>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-heading-xs">Formatting</h2>
        <p className="text-body-sm numeric">
          {formatAmounts([
            { cents: 124000, currency: "EUR" },
            { cents: 30000, currency: "USD" },
          ])}
        </p>
        <p className="text-body-sm">
          <span className="numeric">{sample}</span>
          <span className="text-muted-foreground"> in {settings.timeZone}</span>
        </p>
      </section>

      <EmptyState
        title="Nothing waiting for you"
        description="New proposals from freelancers will show up here."
      />
    </div>
  );
}
