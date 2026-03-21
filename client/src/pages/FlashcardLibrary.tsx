import { useLocation } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Loader2, ArrowLeft, Brain, Flame, Layers } from "lucide-react";

export default function FlashcardLibrary() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.flashcards.getStats.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: flashcards, isLoading: cardsLoading } = trpc.flashcards.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading || statsLoading || cardsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  // Group cards by course
  const grouped = (flashcards || []).reduce((acc: any, card: any) => {
    const courseId = card.course.id;
    if (!acc[courseId]) {
      acc[courseId] = { course: card.course, cards: [] };
    }
    acc[courseId].cards.push(card);
    return acc;
  }, {});
  const courseGroups = Object.values(grouped) as any[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b-2 border-current">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Flashcard Library</h1>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="space-y-12">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-2 border-current p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats?.total || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Cards</div>
                </div>
              </div>
            </Card>
            <Card className="border-2 border-current p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-600 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats?.due || 0}</div>
                  <div className="text-sm text-muted-foreground">Due Now</div>
                </div>
              </div>
            </Card>
            <Card className="border-2 border-current p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats?.learning || 0}</div>
                  <div className="text-sm text-muted-foreground">Learning</div>
                </div>
              </div>
            </Card>
            <Card className="border-2 border-current p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats?.mastered || 0}</div>
                  <div className="text-sm text-muted-foreground">Mastered</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Study Button */}
          {(stats?.due || 0) > 0 && (
            <div className="text-center">
              <Button size="lg" onClick={() => navigate("/flashcards/study")}>
                Study {stats?.due} Due Cards
              </Button>
            </div>
          )}

          {/* Course Groups */}
          <div className="space-y-8">
            {courseGroups.map((group: any) => (
              <Card key={group.course.id} className="border-2 border-current">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{group.course.title}</h3>
                    <span className="text-sm text-muted-foreground">
                      {group.cards.length} cards
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.cards.slice(0, 6).map((card: any) => (
                      <div
                        key={card.id}
                        className="p-3 bg-muted/50 rounded border text-sm"
                      >
                        <p className="font-medium">{card.term}</p>
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                          {card.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
