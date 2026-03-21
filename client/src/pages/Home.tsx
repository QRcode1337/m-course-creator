import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Loader2, Sparkles, Brain, Layers, Library, Settings } from "lucide-react";
import { NodeGraphBackground } from "../components/NodeGraphBackground";
import { CourseSetupWizard } from "../components/CourseSetupWizard";

const PLACEHOLDER_TOPICS = [
  "Quantum Computing Fundamentals",
  "Ancient Philosophy",
  "Machine Learning Basics",
  "Renaissance Art",
  "Blockchain Technology",
  "Neuroscience Introduction",
];

const THEME_CATEGORIES = [
  {
    theme: "Technology & Innovation",
    topics: ["AI Ethics", "Cybersecurity", "Cloud Computing"],
    icon: Sparkles,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    theme: "Science & Nature",
    topics: ["Climate Change", "Genetics", "Astrophysics"],
    icon: Brain,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    theme: "History & Culture",
    topics: ["World War II", "Ancient Civilizations", "Cultural Anthropology"],
    icon: Layers,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    theme: "Arts & Humanities",
    topics: ["Modern Literature", "Music Theory", "Film Studies"],
    icon: Layers,
    gradient: "from-orange-500 to-red-500",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [topic, setTopic] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const generateMutation = trpc.courses.generate.useMutation();

  useEffect(() => {
    const urlTopic = new URLSearchParams(window.location.search).get("topic");
    if (urlTopic) setTopic(urlTopic);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (topic.trim()) {
      setSelectedTopic(topic);
      setShowWizard(true);
    }
  };

  const handleTopicClick = (t: string) => {
    setTopic(t);
    setSelectedTopic(t);
    setShowWizard(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Course setup wizard
  if (showWizard && !isCreating) {
    return (
      <CourseSetupWizard
        topic={selectedTopic}
        onComplete={async (config) => {
          setIsCreating(true);
          try {
            const result = await generateMutation.mutateAsync({
              topic: selectedTopic,
              approach: config.approach,
              familiarityLevel: config.familiarityLevel,
              assessmentAnswers: config.assessmentAnswers,
            });
            toast.success("Course created successfully!");
            setShowWizard(false);
            setIsCreating(false);
            navigate(`/course/${result.courseId}`);
          } catch {
            toast.error("Failed to create course");
            setIsCreating(false);
          }
        }}
        onCancel={() => {
          setShowWizard(false);
          setSelectedTopic("");
        }}
      />
    );
  }

  // Creating state
  if (isCreating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-lg text-muted-foreground">Creating your course...</p>
        </div>
      </div>
    );
  }

  // Main logged-in home page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Course Creator
              </span>
            </div>
            <nav className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/flashcards")} className="gap-2">
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Flashcards</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-2">
                <Library className="w-4 h-4" />
                <span className="hidden sm:inline">My Library</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4" />
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              What do you want to{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                learn today?
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Enter any topic and let AI create a personalized course with lessons, flashcards, and quizzes
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="relative group">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Quantum Computing, Ancient Philosophy..."
                className="h-14 pl-6 pr-32 text-lg rounded-2xl border-2"
              />
              <Button
                type="submit"
                disabled={!topic.trim()}
                className="absolute right-2 top-2 h-10 px-6 rounded-xl"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
          </form>

          {/* Quick Topic Suggestions */}
          <div className="flex flex-wrap justify-center gap-2">
            {PLACEHOLDER_TOPICS.map((t) => (
              <Button
                key={t}
                variant="outline"
                size="sm"
                onClick={() => handleTopicClick(t)}
                className="rounded-full"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Theme Categories */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Explore Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {THEME_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.theme}
                  className="group cursor-pointer rounded-2xl border p-6 hover:shadow-lg transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{category.theme}</h3>
                  <div className="space-y-2">
                    {category.topics.map((t) => (
                      <button
                        key={t}
                        onClick={() => handleTopicClick(t)}
                        className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
