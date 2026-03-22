import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Brain,
  ChevronRight,
  Flame,
  GraduationCap,
  Layers3,
  Search,
  Target,
} from "lucide-react";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";

type FilterMode = "all" | "due" | "learning" | "mastered";

export default function FlashcardLibrary() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const { data: stats, isLoading: statsLoading } = trpc.flashcards.getStats.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: flashcards, isLoading: cardsLoading } = trpc.flashcards.getAll.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: dueCards } = trpc.flashcards.getDue.useQuery(undefined, {
    enabled: !!user,
  });

  const dueSet = useMemo(
    () => new Set((dueCards || []).map((card) => card.term.id)),
    [dueCards],
  );

  const normalizedCards = useMemo(() => {
    return (flashcards || []).map((card: any) => {
      const repetitions = card.review?.repetitions ?? 0;
      return {
        ...card,
        repetitions,
        isDue: dueSet.has(card.id),
        isMastered: repetitions >= 5,
      };
    });
  }, [flashcards, dueSet]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return normalizedCards.filter((card: any) => {
      if (filter === "due" && !card.isDue) return false;
      if (filter === "learning" && card.isMastered) return false;
      if (filter === "mastered" && !card.isMastered) return false;

      if (!normalizedQuery) return true;

      return [
        card.term,
        card.definition,
        card.course.title,
        card.lesson.title,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [filter, normalizedCards, query]);

  const courseGroups = useMemo(() => {
    const grouped = filteredCards.reduce((acc: Record<string, any>, card: any) => {
      const courseId = card.course.id;
      if (!acc[courseId]) {
        acc[courseId] = {
          course: card.course,
          cards: [],
          due: 0,
          mastered: 0,
        };
      }
      acc[courseId].cards.push(card);
      if (card.isDue) acc[courseId].due += 1;
      if (card.isMastered) acc[courseId].mastered += 1;
      return acc;
    }, {});

    return Object.values(grouped).sort((a: any, b: any) => {
      if (b.due !== a.due) return b.due - a.due;
      return b.cards.length - a.cards.length;
    }) as Array<any>;
  }, [filteredCards]);

  const masteryPercent = stats?.total ? Math.round(((stats.mastered || 0) / stats.total) * 100) : 0;
  const activeCourses = new Set((flashcards || []).map((card: any) => card.course.id)).size;

  if (loading || statsLoading || cardsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-8 md:py-12">
        <div className="space-y-10">
          <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Brain className="h-4 w-4 text-primary" />
                Flashcard review
              </div>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
                Review inventory, due queue, and mastery state in one place.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Use the queue to review what is due now, or scan the inventory by course and lesson before starting a study session.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full px-6"
                  onClick={() => navigate("/flashcards/study")}
                >
                  Start review session
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-6"
                  onClick={() => navigate("/library")}
                >
                  Back to library
                </Button>
              </div>
            </div>

            <div className="rounded-[32px] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--muted)/0.54)_0%,transparent_100%)] p-6">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-background p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total cards</div>
                    <div className="mt-2 text-3xl font-semibold">{stats?.total || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-background p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Due now</div>
                    <div className="mt-2 text-3xl font-semibold">{stats?.due || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-background p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Learning</div>
                    <div className="mt-2 text-3xl font-semibold">{stats?.learning || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-background p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Active courses</div>
                    <div className="mt-2 text-3xl font-semibold">{activeCourses}</div>
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl bg-background p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mastery ratio</span>
                    <span className="font-medium">{masteryPercent}%</span>
                  </div>
                  <Progress value={masteryPercent} />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{stats?.mastered || 0} mastered</span>
                    <span>{stats?.total ? stats.total - (stats.mastered || 0) : 0} still in rotation</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-border/70 bg-muted/35 p-5">
                <div className="space-y-4">
                  <div className="text-sm font-semibold">Queue filters</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["all", "due", "learning", "mastered"] as FilterMode[]).map((value) => (
                      <Button
                        key={value}
                        variant={filter === value ? "secondary" : "outline"}
                        className="rounded-xl"
                        onClick={() => setFilter(value)}
                      >
                        {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Search</div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Find by term, lesson, or course"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-border/70 bg-background p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Target className="h-4 w-4 text-primary" />
                    Session guidance
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review due cards first. Use the course groups to spot where your weakest clusters are before jumping into the study session.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {courseGroups.length === 0 ? (
                <div className="rounded-[32px] border border-border/70 bg-muted/25 px-8 py-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Search className="h-7 w-7" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold">No flashcards match this filter.</h2>
                  <p className="mt-2 text-muted-foreground">Try a broader search, or switch to another queue state.</p>
                </div>
              ) : (
                courseGroups.map((group: any) => {
                  const mastery = group.cards.length ? Math.round((group.mastered / group.cards.length) * 100) : 0;
                  return (
                    <section key={group.course.id} className="space-y-4 border-b border-border/60 pb-6 last:border-b-0">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <button
                            type="button"
                            className="text-left text-2xl font-semibold transition-colors hover:text-primary"
                            onClick={() => navigate(`/course/${group.course.id}`)}
                          >
                            {group.course.title}
                          </button>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{group.cards.length} cards</Badge>
                            {group.due > 0 ? <Badge>{group.due} due</Badge> : <Badge variant="secondary">No cards due</Badge>}
                            <span>{group.mastered} mastered</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => navigate(`/course/${group.course.id}`)}
                        >
                          Open course
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="rounded-2xl bg-muted/35 p-4">
                          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mastery</div>
                          <div className="mt-2 text-3xl font-semibold">{mastery}%</div>
                          <div className="mt-3">
                            <Progress value={mastery} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          {group.cards.slice(0, 8).map((card: any) => (
                            <div
                              key={card.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 px-4 py-3 transition-colors hover:bg-muted/35"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{card.term}</div>
                                <div className="truncate text-sm text-muted-foreground">
                                  {card.lesson.title}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {card.isDue ? (
                                  <Badge className="gap-1 rounded-full">
                                    <Flame className="h-3 w-3" />
                                    Due
                                  </Badge>
                                ) : null}
                                {card.isMastered ? (
                                  <Badge variant="secondary" className="gap-1 rounded-full">
                                    <GraduationCap className="h-3 w-3" />
                                    Mastered
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 rounded-full">
                                    <Layers3 className="h-3 w-3" />
                                    Reps {card.repetitions}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
