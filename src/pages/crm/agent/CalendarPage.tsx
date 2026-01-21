import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// Components
import { WeekView } from "@/components/crm/calendar/WeekView";
import { DayView } from "@/components/crm/calendar/DayView";
import { MonthView } from "@/components/crm/calendar/MonthView";
import { ReminderCard } from "@/components/crm/calendar/ReminderCard";
import { ReminderDetailSheet } from "@/components/crm/calendar/ReminderDetailSheet";
import { CreateReminderSheet } from "@/components/crm/calendar/CreateReminderSheet";

// Hooks
import {
  useReminders,
  useCompleteReminder,
  useSnoozeReminder,
  useDeleteReminder,
  useRemindersRealtime,
  useReminderStats,
  type ReminderWithLead,
} from "@/hooks/useReminders";
import { REMINDER_TYPE_CONFIG } from "@/lib/crm-conditional-styles";

type ViewMode = "day" | "week" | "month";

export default function CalendarPage() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReminder, setSelectedReminder] = useState<ReminderWithLead | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createInitialDatetime, setCreateInitialDatetime] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "overdue" | "completed">("all");

  // Get current agent
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setAgentId(session.user.id);
      }
    });
  }, []);

  // Calculate date range for current view
  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (viewMode === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  }, [currentDate, viewMode]);

  // Fetch reminders
  const { data: reminders = [], isLoading } = useReminders({
    agentId,
    dateRange,
    filterType: filterType !== "all" ? filterType : undefined,
    filterStatus,
  });

  // Stats for sidebar
  const { data: stats } = useReminderStats(agentId);

  // Realtime updates
  useRemindersRealtime(agentId);

  // Mutations
  const completeReminder = useCompleteReminder();
  const snoozeReminder = useSnoozeReminder();
  const deleteReminder = useDeleteReminder();

  // Navigation
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    setCurrentDate((prev) =>
      viewMode === "day"
        ? subDays(prev, 1)
        : viewMode === "week"
        ? subWeeks(prev, 1)
        : subMonths(prev, 1)
    );
  };

  const goToNext = () => {
    setCurrentDate((prev) =>
      viewMode === "day"
        ? addDays(prev, 1)
        : viewMode === "week"
        ? addWeeks(prev, 1)
        : addMonths(prev, 1)
    );
  };

  // Handlers
  const handleComplete = (reminderId: string) => {
    completeReminder.mutate(reminderId);
    setSelectedReminder(null);
  };

  const handleSnooze = (reminderId: string, minutes: number) => {
    snoozeReminder.mutate({ reminderId, minutes });
  };

  const handleDelete = (reminderId: string) => {
    deleteReminder.mutate(reminderId);
    setSelectedReminder(null);
  };

  const handleTimeSlotClick = (datetime: Date) => {
    setCreateInitialDatetime(datetime);
    setShowCreateSheet(true);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "t":
          goToToday();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "d":
          setViewMode("day");
          break;
        case "w":
          setViewMode("week");
          break;
        case "m":
          setViewMode("month");
          break;
        case "n":
          setShowCreateSheet(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Upcoming reminders for sidebar (next 10 pending)
  const upcomingReminders = useMemo(() => {
    return reminders
      .filter((r) => !r.is_completed)
      .sort((a, b) => 
        new Date(a.reminder_datetime).getTime() - new Date(b.reminder_datetime).getTime()
      )
      .slice(0, 10);
  }, [reminders]);

  // Get view title
  const getViewTitle = () => {
    if (viewMode === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "MMMM yyyy");
    }
  };

  const pendingCount = reminders.filter((r) => !r.is_completed).length;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Calendar</h1>
              <p className="text-sm text-muted-foreground">
                {pendingCount} pending reminder{pendingCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Export to CSV</DropdownMenuItem>
                <DropdownMenuItem>Export to iCal</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={() => setShowCreateSheet(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Reminder
            </Button>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold ml-2">{getViewTitle()}</h2>
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-4 pt-4 border-t mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Badge
                    variant={filterType === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilterType("all")}
                  >
                    All
                  </Badge>
                  {Object.entries(REMINDER_TYPE_CONFIG).map(([key, config]) => (
                    <Badge
                      key={key}
                      variant={filterType === key ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setFilterType(key)}
                    >
                      {config.icon} {config.label}
                    </Badge>
                  ))}
                </div>

                <DropdownMenuSeparator className="h-6 w-px bg-border" />

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge
                    variant={filterStatus === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilterStatus("all")}
                  >
                    All
                  </Badge>
                  <Badge
                    variant={filterStatus === "pending" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilterStatus("pending")}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                  <Badge
                    variant={filterStatus === "overdue" ? "default" : "outline"}
                    className="cursor-pointer text-destructive"
                    onClick={() => setFilterStatus("overdue")}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                  <Badge
                    variant={filterStatus === "completed" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setFilterStatus("completed")}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar View (3/4 width) */}
        <div className="flex-1 overflow-hidden border-r">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {viewMode === "day" && (
                <DayView
                  reminders={reminders}
                  currentDate={currentDate}
                  onReminderClick={setSelectedReminder}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              )}
              {viewMode === "week" && (
                <WeekView
                  reminders={reminders}
                  currentDate={currentDate}
                  onReminderClick={setSelectedReminder}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              )}
              {viewMode === "month" && (
                <MonthView
                  reminders={reminders}
                  currentDate={currentDate}
                  onDayClick={handleDayClick}
                  onReminderClick={setSelectedReminder}
                />
              )}
            </>
          )}
        </div>

        {/* Upcoming Reminders Sidebar (1/4 width) */}
        <div className="w-80 shrink-0 bg-muted/30">
          <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Upcoming</span>
                {stats && (
                  <div className="flex gap-1">
                    {stats.overdue > 0 && (
                      <Badge variant="destructive" className="animate-pulse">
                        {stats.overdue} overdue
                      </Badge>
                    )}
                    {stats.urgent > 0 && (
                      <Badge className="bg-amber-500">
                        {stats.urgent} urgent
                      </Badge>
                    )}
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="px-4 pb-4 space-y-2">
                  {upcomingReminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onClick={() => setSelectedReminder(reminder)}
                      onComplete={handleComplete}
                      onSnooze={handleSnooze}
                    />
                  ))}

                  {upcomingReminders.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No upcoming reminders</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reminder Detail Sheet */}
      <ReminderDetailSheet
        reminder={selectedReminder}
        isOpen={!!selectedReminder}
        onClose={() => setSelectedReminder(null)}
        onComplete={handleComplete}
        onSnooze={handleSnooze}
        onDelete={handleDelete}
      />

      {/* Create Reminder Sheet */}
      {agentId && (
        <CreateReminderSheet
          isOpen={showCreateSheet}
          onClose={() => {
            setShowCreateSheet(false);
            setCreateInitialDatetime(undefined);
          }}
          agentId={agentId}
          initialDatetime={createInitialDatetime}
        />
      )}
    </div>
  );
}
