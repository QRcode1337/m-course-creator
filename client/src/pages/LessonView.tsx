import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { useStyleTheme } from "../contexts/StyleThemeContext";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Skeleton } from "../components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { LessonContent } from "../components/LessonContent";
import { Quiz } from "../components/Quiz";
import { MediaGenerationDialog } from "../components/MediaGenerationDialog";
import { RelatedTopics } from "../components/RelatedTopics";
import { Loader2, ArrowLeft, Sparkles, Image, Palette } from "lucide-react";

const STYLE_THEMES: Record<string, string> = {};

export default function LessonView() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const lessonId = params.id;
  const { styleTheme, setStyleTheme } = useStyleTheme();
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  const utils = trpc.useUtils();
  const { data: lesson, isLoading } = trpc.lessons.getById.useQuery(
    { lessonId },
    { enabled: !!user && !!lessonId }
  );

  const toggleComplete = trpc.lessons.toggleComplete.useMutation({
    onSuccess: () => {
      utils.lessons.getById.invalidate({ lessonId });
    },
  });

  const regenerate = trpc.lessons.regenerate.useMutation();
  const chat = trpc.lessons.chat.useMutation();
  const generateMedia = trpc.media.generate.useMutation({
    onSuccess: async () => {
      await utils.lessons.getById.invalidate({ lessonId });
      setShowMediaDialog(false);
    },
  });

  const handleToggleComplete = (checked: boolean) => {
    toggleComplete.mutate({ lessonId, completed: checked });
  };

  const handleSendChat = async (message: string) => {
    const userMsg = { role: "user", content: message };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    try {
      const response = await chat.mutateAsync({
        lessonId,
        message,
        conversationHistory: chatMessages,
      });
      const assistantMsg = {
        role: "assistant",
        content: typeof response.message === "string" ? response.message : "",
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
    }
  };

  const handleGenerateMedia = async (customPrompt: string) => {
    const prompt = customPrompt.trim() || `Create an educational illustration for the lesson "${lesson?.title ?? "this lesson"}"`;
    await generateMedia.mutateAsync({ lessonId, prompt });
  };

  const renderContent = (content: string) => {
    if (!lesson?.glossaryTerms || lesson.glossaryTerms.length === 0) {
      return <LessonContent>{content}</LessonContent>;
    }
    return (
      <LessonContent
        content={content}
        glossaryTerms={lesson.glossaryTerms.map((t: any) => ({
          term: t.term,
          definition: t.definition,
        }))}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar */}
      <div className="border-b-2 border-current py-6">
        <div className="container">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-4">
              {/* Regenerate Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm("Regenerate this lesson? This will replace the current content with new AI-generated content.")) {
                    try {
                      await regenerate.mutateAsync({ lessonId });
                      await utils.lessons.getById.invalidate({ lessonId });
                      alert("Lesson regenerated successfully!");
                    } catch {
                      alert("Failed to regenerate lesson. Please try again.");
                    }
                  }
                }}
                disabled={regenerate.isPending}
                className="gap-2"
              >
                {regenerate.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {regenerate.isPending ? "Regenerating..." : "Regenerate"}
              </Button>

              {/* Generate Media */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMediaDialog(true)}
                className="gap-2"
              >
                <Image className="w-4 h-4" />
                Generate Media
              </Button>

              {/* Style Theme */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Palette className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.keys(STYLE_THEMES).map((theme) => (
                    <DropdownMenuItem
                      key={theme}
                      onClick={() => setStyleTheme(theme)}
                      className={styleTheme === theme ? "bg-accent" : ""}
                    >
                      {STYLE_THEMES[theme]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Completion Toggle */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="completed"
                  checked={lesson?.completed || false}
                  onCheckedChange={handleToggleComplete}
                />
                <label htmlFor="completed" className="text-sm font-medium cursor-pointer">
                  Mark as complete
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              {lesson.lessonType && (
                <div className="inline-block">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-accent rounded">
                    {lesson.lessonType}
                  </span>
                </div>
              )}
              <h1 className="text-4xl font-bold leading-tight">{lesson.title}</h1>
            </div>

            {/* Sortable Illustrations */}
            {/* (DnD Kit sortable illustrations would go here) */}

            {/* Main Lesson Content (Markdown) */}
            {lesson.content && renderContent(lesson.content)}

            {/* Quiz Section */}
            <Quiz lessonId={lessonId} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Chat */}
            <Card className="border-2 border-current p-6 space-y-4">
              <h3 className="font-bold text-lg">Ask AI about this lesson</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded text-sm ${
                      msg.role === "user" ? "bg-accent ml-4" : "bg-muted mr-4"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && chatInput.trim()) {
                      handleSendChat(chatInput);
                    }
                  }}
                  placeholder="Ask a question..."
                  className="flex-1 px-3 py-2 border rounded text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => chatInput.trim() && handleSendChat(chatInput)}
                  disabled={chat.isPending}
                >
                  Send
                </Button>
              </div>
            </Card>

            {/* Related Topics */}
            {lesson.relatedTopics && <RelatedTopics topics={lesson.relatedTopics} />}

            {/* Glossary */}
            {lesson.glossaryTerms && lesson.glossaryTerms.length > 0 && (
              <Card className="border-2 border-current p-6 space-y-4">
                <h3 className="font-bold text-lg">Key Terms</h3>
                <div className="space-y-3">
                  {lesson.glossaryTerms.map((term: any) => (
                    <div key={term.term} className="space-y-1">
                      <p className="font-bold text-sm">{term.term}</p>
                      <p className="text-xs text-muted-foreground">{term.definition}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Media Generation Dialog */}
      <MediaGenerationDialog
        open={showMediaDialog}
        onOpenChange={setShowMediaDialog}
        lessonTitle={lesson.title}
        lessonContent={lesson.content || ""}
        onGenerate={handleGenerateMedia}
        isGenerating={generateMedia.isPending}
      />
    </div>
  );
}
