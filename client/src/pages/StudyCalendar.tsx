import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Loader2, Trophy, Flame } from "lucide-react";

export default function StudyCalendar() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: completedLessons, isLoading: lessonsLoading } = trpc.lessons.getCompleted.useQuery(undefined, { enabled: !!user });
  const { data: dueFlashcards, isLoading: flashcardsLoading } = trpc.flashcards.getDue.useQuery(undefined, { enabled: !!user });
  const { data: stats, isLoading: statsLoading } = trpc.flashcards.getStats.useQuery(undefined, { enabled: !!user });

  // Calculate study streak
  const streak = useMemo(() => {
    if (!completedLessons) return 0;
    const dates = completedLessons
      .filter((l: any) => l.completed)
      .map((l: any) => new Date(l.completedAt).toDateString())
      .sort()
      .reverse();

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let count = 0;
    let checkDate = new Date();
    for (const date of dates) {
      if (date === new Date(checkDate).toDateString()) {
        count++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else break;
    }
    return count;
  }, [completedLessons]);

  // Build calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay();
    const days: any[] = [];

    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toDateString();
      const lessonsCompleted = completedLessons?.filter(
        (l: any) => l.completed && new Date(l.completedAt).toDateString() === dateStr
      ).length || 0;
      const flashcardsDue = dueFlashcards?.filter(
        (f: any) => new Date(f.review.nextReviewDate).toDateString() === dateStr
      ).length || 0;
      days.push({ day: d, date, lessonsCompleted, flashcardsDue, isToday: dateStr === new Date().toDateString() });
    }
    return days;
  }, [currentMonth, completedLessons, dueFlashcards]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (loading || lessonsLoading || flashcardsLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) { navigate("/"); return null; }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b-2 border-current">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Study Calendar</h1>
            <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </div>
      </header>

      <main className="container py-12 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-current p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary flex items-center justify-center rounded">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-3xl font-bold">{streak} days</p>
              </div>
            </div>
          </Card>
          <Card className="border-2 border-current p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary flex items-center justify-center rounded">
                <Flame className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-3xl font-bold">{stats?.due || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="border-2 border-current p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary flex items-center justify-center rounded">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mastered</p>
                <p className="text-3xl font-bold">{stats?.mastered || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <Card className="border-2 border-current p-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
              &larr;
            </Button>
            <h2 className="text-xl font-bold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
              &rarr;
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground p-2">{day}</div>
            ))}
            {calendarDays.map((day, i) => (
              <div key={i} className={`p-2 min-h-[60px] rounded ${day?.isToday ? "bg-primary/10 border border-primary" : ""}`}>
                {day && (
                  <>
                    <span className="text-sm font-medium">{day.day}</span>
                    {day.lessonsCompleted > 0 && <div className="w-2 h-2 bg-green-500 rounded-full mt-1" />}
                    {day.flashcardsDue > 0 && <div className="w-2 h-2 bg-orange-500 rounded-full mt-1" />}
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
