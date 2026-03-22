import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock3,
  Flame,
  GraduationCap,
} from "lucide-react";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Flashcard } from "../components/Flashcard";

export default function FlashcardStudy() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const { data: dueCards, isLoading, refetch } = trpc.flashcards.getDue.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: stats } = trpc.flashcards.getStats.useQuery(undefined, { enabled: !!user });
  const rateMutation = trpc.flashcards.rate.useMutation();

  const currentCard = dueCards?.[currentIndex];
  const completionPercent = dueCards?.length ? ((currentIndex + 1) / dueCards.length) * 100 : 0;
  const studiedRemaining = dueCards?.length ? dueCards.length - currentIndex - 1 : 0;
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const queuePreview = useMemo(() => {
    return (dueCards || []).slice(currentIndex + 1, currentIndex + 5);
  }, [currentIndex, dueCards]);

  const handleRate = (rating: "again" | "hard" | "good" | "easy") => {
    if (!currentCard) return;
    const isCorrect = rating === "good" || rating === "easy";

    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    rateMutation.mutate({ glossaryTermId: currentCard.term.id, rating });

    if (dueCards && currentIndex < dueCards.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setSessionComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSessionComplete(false);
    setScore({ correct: 0, total: 0 });
    refetch();
  };

  if (loading || isLoading) {
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

  if (!dueCards || dueCards.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container py-10">
          <div className="rounded-[36px] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--muted)/0.5)_0%,transparent_100%)] px-8 py-14 text-center">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-4xl font-bold">No cards are due right now.</h1>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              You are caught up on scheduled reviews. Use the library to inspect mastered cards or come back later when the queue refills.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button className="rounded-full px-6" onClick={() => navigate("/flashcards")}>
                Open flashcard library
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/library")}>
                Back to courses
              </Button>
            </div>
            <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-background p-5">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total cards</div>
                <div className="mt-2 text-3xl font-semibold">{stats?.total || 0}</div>
              </div>
              <div className="rounded-2xl bg-background p-5">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Learning</div>
                <div className="mt-2 text-3xl font-semibold">{stats?.learning || 0}</div>
              </div>
              <div className="rounded-2xl bg-background p-5">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mastered</div>
                <div className="mt-2 text-3xl font-semibold">{stats?.mastered || 0}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (sessionComplete) {
    const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container py-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[36px] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--muted)/0.5)_0%,transparent_100%)] px-8 py-14">
              <div className="space-y-6">
                <Badge className="rounded-full px-3 py-1">Session complete</Badge>
                <div className="text-6xl font-semibold">{percentage}%</div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold">
                    {percentage >= 80 ? "Excellent recall." : percentage >= 60 ? "Good progress." : "Keep the rotation going."}
                  </h1>
                  <p className="text-muted-foreground">
                    You marked {score.correct} of {score.total} cards as known this round.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-full px-6" onClick={handleRestart}>Study again</Button>
                  <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/flashcards")}>Back to library</Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background p-5">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Accuracy</div>
                <div className="mt-2 text-3xl font-semibold">{accuracy}%</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-5">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mastered overall</div>
                <div className="mt-2 text-3xl font-semibold">{stats?.mastered || 0}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-5">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Still learning</div>
                <div className="mt-2 text-3xl font-semibold">{stats?.learning || 0}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Button variant="ghost" className="gap-2 rounded-full" onClick={() => navigate("/flashcards")}>
              <ArrowLeft className="h-4 w-4" />
              Exit session
            </Button>

            <div className="rounded-[28px] border border-border/70 bg-muted/35 p-5">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Review session</div>
                  <h1 className="mt-2 text-2xl font-semibold">Focused recall queue</h1>
                </div>
                <Progress value={completionPercent} />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{currentIndex + 1} of {dueCards.length}</span>
                  <span>{studiedRemaining} remaining</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Brain className="h-4 w-4 text-primary" />
                  Current card context
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Course</div>
                    <div className="font-medium">{currentCard.course.title}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Lesson</div>
                    <div className="font-medium">{currentCard.term.lessonTitle}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock3 className="h-4 w-4 text-primary" />
                  Queue preview
                </div>
                {queuePreview.length === 0 ? (
                  <p className="text-sm text-muted-foreground">This is the last card in the current session.</p>
                ) : (
                  <div className="space-y-2">
                    {queuePreview.map((card, index) => (
                      <div key={card.term.id} className="rounded-xl bg-muted/35 px-3 py-2">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Up next {index + 1}</div>
                        <div className="mt-1 text-sm font-medium">{card.term.term}</div>
                        <div className="text-xs text-muted-foreground">{card.course.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Due now</div>
                <div className="mt-2 flex items-center gap-2 text-3xl font-semibold">
                  <Flame className="h-5 w-5 text-primary" />
                  {dueCards.length}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Session accuracy</div>
                <div className="mt-2 text-3xl font-semibold">{accuracy}%</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mastered overall</div>
                <div className="mt-2 flex items-center gap-2 text-3xl font-semibold">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {stats?.mastered || 0}
                </div>
              </div>
            </div>

            <Flashcard
              term={currentCard.term.term}
              definition={currentCard.term.definition}
              onRate={handleRate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
