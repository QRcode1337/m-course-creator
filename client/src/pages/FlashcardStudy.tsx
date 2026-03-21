import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Flashcard } from "../components/Flashcard";
import { Loader2 } from "lucide-react";

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

  const handleRate = (rating: "again" | "hard" | "good" | "easy") => {
    if (!dueCards?.[currentIndex]) return;
    const isCorrect = rating === "good" || rating === "easy";
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    rateMutation.mutate({ glossaryTermId: dueCards[currentIndex].term.id, rating });

    if (currentIndex < dueCards.length - 1) {
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
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) { navigate("/"); return null; }

  // No cards due
  if (!dueCards || dueCards.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b-2 border-current">
          <div className="container py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Flashcard Study</h1>
              <Button variant="outline" onClick={() => navigate("/flashcards")}>Back to Flashcards</Button>
            </div>
          </div>
        </header>
        <main className="container py-20">
          <Card className="border-2 border-current p-16 text-center max-w-2xl mx-auto">
            <div className="space-y-6">
              <div className="w-20 h-20 bg-primary mx-auto" />
              <h2 className="text-3xl font-bold">No cards due for review</h2>
              <p className="text-lg text-muted-foreground">
                Great job! You're all caught up. Come back later for your next review session.
              </p>
              {stats && (
                <div className="grid grid-cols-3 gap-4 pt-6">
                  <div>
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Cards</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{stats.learning}</div>
                    <div className="text-sm text-muted-foreground">Learning</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{stats.mastered}</div>
                    <div className="text-sm text-muted-foreground">Mastered</div>
                  </div>
                </div>
              )}
              <Button onClick={() => navigate("/flashcards")} className="mt-6">
                View All Flashcards
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Session complete
  if (sessionComplete) {
    const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b-2 border-current">
          <div className="container py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Session Complete</h1>
              <Button variant="outline" onClick={() => navigate("/flashcards")}>Back to Flashcards</Button>
            </div>
          </div>
        </header>
        <main className="container py-20">
          <Card className="border-2 border-current p-16 text-center max-w-2xl mx-auto space-y-8">
            <div className="w-24 h-24 bg-primary mx-auto flex items-center justify-center rounded-full">
              <span className="text-4xl font-bold text-primary-foreground">{percentage}%</span>
            </div>
            <h2 className="text-3xl font-bold">
              {percentage >= 80 ? "Excellent!" : percentage >= 60 ? "Good job!" : "Keep practicing!"}
            </h2>
            <p className="text-muted-foreground">
              You got {score.correct} out of {score.total} correct
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate("/flashcards")}>Done</Button>
              <Button onClick={handleRestart}>Study Again</Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Active study
  const currentCard = dueCards[currentIndex];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b-2 border-current">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Flashcard Study</h1>
            <Button variant="outline" onClick={() => navigate("/flashcards")}>Exit</Button>
          </div>
        </div>
      </header>
      <main className="container py-12 max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Progress value={((currentIndex + 1) / dueCards.length) * 100} className="flex-1" />
          <span className="text-sm font-bold">{currentIndex + 1} / {dueCards.length}</span>
        </div>
        <Flashcard
          term={currentCard.term.term}
          definition={currentCard.term.definition}
          onRate={handleRate}
        />
      </main>
    </div>
  );
}
