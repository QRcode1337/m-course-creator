import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { useStyleTheme } from "../contexts/StyleThemeContext";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
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
import { SortableIllustration } from "../components/SortableIllustration";
import { AIChatBox, type Message } from "../components/AIChatBox";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Sparkles, Image, Palette, Lightbulb, BookOpen, HelpCircle, Zap, NotebookPen, Save } from "lucide-react";

const STYLE_THEMES: Record<string, string> = {};

export default function LessonView() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const lessonId = params.id;
  const { styleTheme, setStyleTheme } = useStyleTheme();
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  const utils = trpc.useUtils();
  const { data: lesson, isLoading } = trpc.lessons.getById.useQuery(
    { lessonId },
    { enabled: !!user && !!lessonId }
  );
  const { data: course } = trpc.courses.getById.useQuery(
    { courseId: lesson?.course.id ?? "" },
    { enabled: !!lesson?.course.id },
  );
  const { data: note } = trpc.notes.getByLessonId.useQuery(
    { lessonId },
    { enabled: !!lessonId },
  );
  const { data: illustrations = [] } = trpc.media.getByLesson.useQuery(
    { lessonId },
    { enabled: !!lessonId },
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
      await utils.media.getByLesson.invalidate({ lessonId });
      setShowMediaDialog(false);
    },
  });
  const deleteMedia = trpc.media.delete.useMutation({
    onSuccess: async () => {
      await utils.lessons.getById.invalidate({ lessonId });
      await utils.media.getByLesson.invalidate({ lessonId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete illustration.");
    },
  });
  const reorderMedia = trpc.media.reorder.useMutation({
    onSuccess: async () => {
      await utils.media.getByLesson.invalidate({ lessonId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reorder illustrations.");
    },
  });
  const saveNote = trpc.notes.save.useMutation({
    onSuccess: async () => {
      setNotesDirty(false);
      await utils.notes.getByLessonId.invalidate({ lessonId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save notes.");
    },
  });

  useEffect(() => {
    if (note && !notesDirty) {
      setNotes(note.content);
    }
  }, [note, notesDirty]);

  useEffect(() => {
    if (!lessonId || !notesDirty) return;
    const timer = window.setTimeout(() => {
      saveNote.mutate({ lessonId, content: notes });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [lessonId, notes, notesDirty]);

  const handleToggleComplete = (checked: boolean) => {
    toggleComplete.mutate({ lessonId, completed: checked });
  };

  const handleSendChat = async (message: string) => {
    const userMsg: Message = { role: "user", content: message };
    setChatMessages((prev) => [...prev, userMsg]);
    try {
      const response = await chat.mutateAsync({
        lessonId,
        message,
        conversationHistory: chatMessages,
      });
      const assistantMsg: Message = {
        role: "assistant",
        content: typeof response.message === "string" ? response.message : "",
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get AI response for this lesson.");
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

  const handleIllustrationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = illustrations.findIndex((item) => item.id === active.id);
    const newIndex = illustrations.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(illustrations, oldIndex, newIndex).map((item) => item.id);
    reorderMedia.mutate({ lessonId, orderedIds: reordered });
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

  const suggestedPrompts = [
    `Explain "${lesson.title}" in simpler language.`,
    `Give me three practical examples from "${lesson.title}".`,
    `Quiz me on the main ideas from this lesson.`,
    `What should I remember most from this lesson?`,
  ];
  const allLessons = useMemo(() => course?.chapters.flatMap((chapter: any) => chapter.lessons || []) || [], [course]);
  const currentLessonIndex = useMemo(
    () => allLessons.findIndex((entry: any) => entry.id === lessonId),
    [allLessons, lessonId],
  );
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
    ? allLessons[currentLessonIndex + 1]
    : null;

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

            {illustrations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Lesson Media</h2>
                  <p className="text-sm text-muted-foreground">
                    Drag to reorder. Hover to regenerate or delete.
                  </p>
                </div>
                <DndContext collisionDetection={closestCenter} onDragEnd={handleIllustrationDragEnd}>
                  <SortableContext
                    items={illustrations.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {illustrations.map((item) => (
                        <SortableIllustration
                          key={item.id}
                          id={item.id}
                          imageUrl={item.imageUrl}
                          prompt={item.prompt}
                          lessonTitle={lesson.title}
                          onDelete={() => deleteMedia.mutate({ illustrationId: item.id })}
                          onRegenerate={() => generateMedia.mutate({ lessonId, prompt: item.prompt })}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Main Lesson Content (Markdown) */}
            {lesson.content && renderContent(lesson.content)}

            {/* Quiz Section */}
            <Quiz lessonId={lessonId} />

            <div className="flex items-center justify-between border-t pt-6">
              <Button
                variant="outline"
                disabled={!previousLesson}
                onClick={() => previousLesson && navigate(`/lesson/${previousLesson.id}`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous Lesson
              </Button>
              <Button
                variant="outline"
                disabled={!nextLesson}
                onClick={() => nextLesson && navigate(`/lesson/${nextLesson.id}`)}
              >
                Next Lesson
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Chat */}
            <Card className="border-2 border-current p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="font-bold text-lg">Ask AI about this lesson</h3>
                <p className="text-sm text-muted-foreground">
                  Use the lesson context for explanations, examples, and quick self-checks.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Explain simply", icon: Lightbulb, prompt: suggestedPrompts[0] },
                  { label: "Give examples", icon: Zap, prompt: suggestedPrompts[1] },
                  { label: "Quiz me", icon: HelpCircle, prompt: suggestedPrompts[2] },
                  { label: "Summarize", icon: BookOpen, prompt: suggestedPrompts[3] },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.label}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2"
                      disabled={chat.isPending}
                      onClick={() => handleSendChat(item.prompt)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
              <AIChatBox
                messages={chatMessages}
                onSendMessage={handleSendChat}
                isLoading={chat.isPending}
                placeholder="Ask a question about this lesson..."
                height={420}
                emptyStateMessage="Start a lesson-specific conversation."
                suggestedPrompts={suggestedPrompts}
              />
            </Card>

            {/* Related Topics */}
            {lesson.relatedTopics && <RelatedTopics topics={lesson.relatedTopics} />}

            <Card className="border-2 border-current p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <NotebookPen className="h-4 w-4" />
                    Lesson Notes
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Notes are saved automatically for this lesson.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  {saveNote.isPending ? "Saving..." : notesDirty ? "Unsaved" : "Saved"}
                </div>
              </div>
              <Textarea
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setNotesDirty(true);
                }}
                placeholder="Capture key takeaways, examples, questions, or next steps."
                className="min-h-40"
              />
            </Card>

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
