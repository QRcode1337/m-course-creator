import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  HelpCircle,
  Image,
  Layers3,
  Lightbulb,
  Loader2,
  NotebookPen,
  Save,
  Sparkles,
  Zap,
} from "lucide-react";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import { LessonContent } from "../components/LessonContent";
import { Quiz } from "../components/Quiz";
import { MediaGenerationDialog } from "../components/MediaGenerationDialog";
import { SortableIllustration } from "../components/SortableIllustration";
import { AIChatBox, type Message } from "../components/AIChatBox";

export default function LessonView() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const lessonId = params.id;
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  const utils = trpc.useUtils();
  const { data: lesson, isLoading } = trpc.lessons.getById.useQuery(
    { lessonId },
    { enabled: !!user && !!lessonId },
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
    onSuccess: async () => {
      await utils.lessons.getById.invalidate({ lessonId });
      await utils.courses.getById.invalidate({ courseId: lesson?.course.id ?? "" });
    },
  });

  const regenerate = trpc.lessons.regenerate.useMutation();
  const chat = trpc.lessons.chat.useMutation();
  const generateMedia = trpc.media.generate.useMutation({
    onSuccess: async () => {
      await utils.lessons.getById.invalidate({ lessonId });
      await utils.media.getByLesson.invalidate({ lessonId });
      setShowMediaDialog(false);
      toast.success("Illustration generated.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate illustration.");
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

  const allLessons = useMemo<any[]>(
    () => (course?.chapters.flatMap((chapter: any) => chapter.lessons || []) as any[]) || [],
    [course],
  );
  const currentLessonIndex = useMemo(
    () => allLessons.findIndex((entry: any) => entry.id === lessonId),
    [allLessons, lessonId],
  );
  const chapterLessons = useMemo<any[]>(() => {
    if (!lesson) return [] as any[];
    return (course?.chapters.find((chapter: any) => chapter.id === lesson.chapter.id)?.lessons as any[]) || [];
  }, [course, lesson]);
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
    ? allLessons[currentLessonIndex + 1]
    : null;

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  if (!lesson) return null;

  const suggestedPrompts = [
    `Explain "${lesson.title}" in simpler language.`,
    `Give me three practical examples from "${lesson.title}".`,
    `Quiz me on the main ideas from this lesson.`,
    `What should I remember most from this lesson?`,
  ];
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((entry: any) => entry.completed).length;
  const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const chapterCompletedLessons = chapterLessons.filter((entry: any) => entry.completed).length;
  const chapterProgress = chapterLessons.length > 0
    ? Math.round((chapterCompletedLessons / chapterLessons.length) * 100)
    : 0;
  const currentLessonNumber = currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/70 bg-[linear-gradient(180deg,hsl(var(--muted)/0.42)_0%,transparent_100%)]">
        <div className="container py-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => window.history.back()} className="gap-2 rounded-full">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full"
                  onClick={async () => {
                    if (confirm("Regenerate this lesson? This will replace the current content with new AI-generated content.")) {
                      try {
                        await regenerate.mutateAsync({ lessonId });
                        await utils.lessons.getById.invalidate({ lessonId });
                        toast.success("Lesson regenerated.");
                      } catch {
                        toast.error("Failed to regenerate lesson.");
                      }
                    }
                  }}
                  disabled={regenerate.isPending}
                >
                  {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {regenerate.isPending ? "Regenerating..." : "Regenerate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full"
                  onClick={() => setShowMediaDialog(true)}
                >
                  <Image className="w-4 h-4" />
                  Generate Media
                </Button>
                <label className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-sm font-medium">
                  <Checkbox
                    id="completed"
                    checked={lesson.completed || false}
                    onCheckedChange={handleToggleComplete}
                  />
                  Mark complete
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span>{lesson.course.title}</span>
                <span className="text-border">/</span>
                <span>{lesson.chapter.title}</span>
                <span className="text-border">/</span>
                <span>Lesson {currentLessonNumber} of {totalLessons || 1}</span>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl space-y-4">
                  {lesson.lessonType && (
                    <div className="inline-flex rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {lesson.lessonType}
                    </div>
                  )}
                  <h1 className="text-4xl font-bold leading-tight md:text-5xl">{lesson.title}</h1>
                  <p className="max-w-2xl text-base text-muted-foreground">
                    Read, quiz yourself, capture notes, and move through the course with the study rail beside you.
                  </p>
                </div>

                <div className="grid min-w-[250px] grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-border/70 bg-background/90 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Course progress</div>
                    <div className="mt-2 text-3xl font-semibold">{courseProgress}%</div>
                    <div className="mt-1 text-sm text-muted-foreground">{completedLessons} of {totalLessons} lessons done</div>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/90 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Chapter progress</div>
                    <div className="mt-2 text-3xl font-semibold">{chapterProgress}%</div>
                    <div className="mt-1 text-sm text-muted-foreground">{chapterCompletedLessons} of {chapterLessons.length} completed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            {illustrations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Lesson Media</h2>
                  <p className="text-sm text-muted-foreground">Drag to reorder. Hover to regenerate or delete.</p>
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

            {lesson.content && renderContent(lesson.content)}

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

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[28px] border border-border/70 bg-muted/35 p-5">
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Compass className="h-4 w-4 text-primary" />
                    Study rail
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Track where you are, move between lessons, and keep your notes nearby.
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl bg-background p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current position</span>
                    <span className="font-medium">#{currentLessonNumber}</span>
                  </div>
                  <Progress value={courseProgress} />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{completedLessons} complete</span>
                    <span>{Math.max(totalLessons - completedLessons, 0)} remaining</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={!previousLesson}
                    onClick={() => previousLesson && navigate(`/lesson/${previousLesson.id}`)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!nextLesson}
                    onClick={() => nextLesson && navigate(`/lesson/${nextLesson.id}`)}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Card className="border-border/70 p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Course map</h3>
                </div>
                <div className="space-y-4">
                  {course?.chapters.map((chapter: any, chapterIndex: number) => (
                    <div key={chapter.id} className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Chapter {chapterIndex + 1}
                      </div>
                      <div className="text-sm font-medium">{chapter.title}</div>
                      <div className="space-y-1.5">
                        {chapter.lessons.map((entry: any, lessonIndex: number) => {
                          const current = entry.id === lessonId;
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => navigate(`/lesson/${entry.id}`)}
                              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                                current
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <span className="truncate">
                                {lessonIndex + 1}. {entry.title}
                              </span>
                              {entry.completed ? <CheckCircle2 className="ml-3 h-4 w-4 shrink-0" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="border-border/70 p-5 space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Ask AI about this lesson</h3>
                <p className="text-sm text-muted-foreground">
                  Use the lesson context for explanations, examples, and quick self-checks.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Explain simply", icon: Lightbulb, prompt: suggestedPrompts[0] },
                  { label: "Give examples", icon: Zap, prompt: suggestedPrompts[1] },
                  { label: "Quiz me", icon: HelpCircle, prompt: suggestedPrompts[2] },
                  { label: "Summarize", icon: Sparkles, prompt: suggestedPrompts[3] },
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
                height={360}
                emptyStateMessage="Start a lesson-specific conversation."
                suggestedPrompts={suggestedPrompts}
              />
            </Card>

            <Card className="border-border/70 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <NotebookPen className="h-4 w-4" />
                    Lesson Notes
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Notes are saved automatically for this lesson.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
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

            {lesson.glossaryTerms && lesson.glossaryTerms.length > 0 && (
              <Card className="border-border/70 p-5 space-y-4">
                <h3 className="font-semibold text-lg">Key Terms</h3>
                <div className="space-y-3">
                  {lesson.glossaryTerms.map((term: any) => (
                    <div key={term.term} className="rounded-2xl bg-muted/60 p-3">
                      <p className="font-bold text-sm">{term.term}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{term.definition}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

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
