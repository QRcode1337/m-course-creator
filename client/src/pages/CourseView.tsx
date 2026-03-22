import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Download,
  Image,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { getApiUrl } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";

export default function CourseView() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data: course, isLoading } = trpc.courses.getById.useQuery(
    { courseId },
    { enabled: !!user && !!courseId },
  );
  const { data: flashcards = [] } = trpc.flashcards.getAll.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: dueCards = [] } = trpc.flashcards.getDue.useQuery(undefined, {
    enabled: !!user,
  });

  const initFlashcards = trpc.flashcards.initializeFromCourse.useMutation();
  const utils = trpc.useUtils();
  const generateAllImages = trpc.media.generateAllForCourse.useMutation({
    onSuccess: async (result) => {
      await utils.courses.getById.invalidate({ courseId });
      toast.success(`Images updated. Generated ${result.generated}, skipped ${result.skipped}.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate course images.");
    },
  });

  const totalLessons = useMemo(
    () => course?.chapters?.reduce((acc: number, chapter: any) => acc + (chapter.lessons?.length || 0), 0) || 0,
    [course],
  );
  const completedLessons = useMemo(
    () => course?.chapters?.reduce(
      (acc: number, chapter: any) => acc + (chapter.lessons?.filter((lesson: any) => lesson.completed).length || 0),
      0,
    ) || 0,
    [course],
  );
  const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const totalFlashcards = useMemo(
    () => course?.chapters?.reduce(
      (acc: number, chapter: any) =>
        acc + (chapter.lessons?.reduce((lessonAcc: number, lesson: any) => lessonAcc + (lesson.flashcardCount || 0), 0) || 0),
      0,
    ) || 0,
    [course],
  );

  const courseFlashcards = useMemo(
    () => flashcards.filter((card: any) => card.course.id === courseId),
    [courseId, flashcards],
  );
  const dueForCourse = useMemo(
    () => dueCards.filter((card: any) => card.course.id === courseId).length,
    [courseId, dueCards],
  );
  const masteredForCourse = useMemo(
    () => courseFlashcards.filter((card: any) => (card.review?.repetitions ?? 0) >= 5).length,
    [courseFlashcards],
  );
  const reviewCoverage = totalFlashcards > 0 ? Math.round((courseFlashcards.length / totalFlashcards) * 100) : 0;

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const response = await fetch(getApiUrl(`/api/courses/${encodeURIComponent(courseId)}/pdf`), {
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to export PDF.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/i);
      const filename = filenameMatch?.[1]
        || `${course?.title?.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "course"}.pdf`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export PDF.";
      toast.error(`Failed to export PDF: ${message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleStudyFlashcards = async () => {
    try {
      const result = await initFlashcards.mutateAsync({ courseId });
      if (result.success) {
        toast.success(`${result.initialized} flashcards ready to study!`);
        navigate("/flashcards/study");
      }
    } catch {
      toast.error("Failed to initialize flashcards");
    }
  };

  if (loading || isLoading) {
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

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/70 bg-[linear-gradient(180deg,hsl(var(--muted)/0.5)_0%,transparent_100%)]">
        <div className="container py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Course workspace
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight lg:text-5xl">{course.title}</h1>
                {course.description ? (
                  <p className="max-w-3xl text-lg text-muted-foreground">{course.description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="rounded-full px-3 py-1">{course.chapters?.length || 0} chapters</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">{totalLessons} lessons</Badge>
                {totalFlashcards > 0 ? <Badge className="rounded-full px-3 py-1">{totalFlashcards} flashcards</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full px-6"
                  onClick={handleStudyFlashcards}
                  disabled={initFlashcards.isPending}
                >
                  {initFlashcards.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                  Study this course
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-6"
                  onClick={() => generateAllImages.mutate({ courseId, skipExisting: true })}
                  disabled={generateAllImages.isPending}
                >
                  {generateAllImages.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image className="mr-2 h-4 w-4" />}
                  Generate visuals
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-6"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                >
                  {isExportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="rounded-[32px] border border-border/70 bg-background/90 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/35 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Lesson progress</div>
                  <div className="mt-2 text-3xl font-semibold">{courseProgress}%</div>
                  <div className="mt-1 text-sm text-muted-foreground">{completedLessons} of {totalLessons} completed</div>
                </div>
                <div className="rounded-2xl bg-muted/35 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Due reviews</div>
                  <div className="mt-2 text-3xl font-semibold">{dueForCourse}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Cards waiting now</div>
                </div>
                <div className="rounded-2xl bg-muted/35 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Review coverage</div>
                  <div className="mt-2 text-3xl font-semibold">{reviewCoverage}%</div>
                  <div className="mt-1 text-sm text-muted-foreground">{courseFlashcards.length} reviews initialized</div>
                </div>
                <div className="rounded-2xl bg-muted/35 p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mastered cards</div>
                  <div className="mt-2 text-3xl font-semibold">{masteredForCourse}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Stable recall in this course</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Course content</h2>
                  <p className="text-sm text-muted-foreground">Open any lesson directly or scan chapter completion first.</p>
                </div>
              </div>

              <div className="space-y-6">
                {course.chapters?.map((chapter: any, chapterIdx: number) => {
                  const chapterLessons = chapter.lessons || [];
                  const chapterCompleted = chapterLessons.filter((lesson: any) => lesson.completed).length;
                  const chapterProgress = chapterLessons.length ? Math.round((chapterCompleted / chapterLessons.length) * 100) : 0;
                  const chapterFlashcards = chapterLessons.reduce((acc: number, lesson: any) => acc + (lesson.flashcardCount || 0), 0);

                  return (
                    <section key={chapter.id} className="space-y-4 border-b border-border/60 pb-6 last:border-b-0">
                      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_240px]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background font-semibold">
                          {chapterIdx + 1}
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">{chapter.title}</h3>
                          {chapter.description ? <p className="text-sm text-muted-foreground">{chapter.description}</p> : null}
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{chapterLessons.length} lessons</span>
                            <span>·</span>
                            <span>{chapterFlashcards} flashcards</span>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-muted/35 p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Chapter progress</span>
                            <span className="font-medium">{chapterProgress}%</span>
                          </div>
                          <div className="mt-3">
                            <Progress value={chapterProgress} />
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">{chapterCompleted} of {chapterLessons.length} lessons complete</div>
                        </div>
                      </div>

                      <div className="space-y-2 pl-0 lg:pl-14">
                        {chapterLessons.map((lesson: any, lessonIdx: number) => (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => navigate(`/lesson/${lesson.id}`)}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 px-4 py-3 text-left transition-colors hover:bg-muted/35"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{lessonIdx + 1}.</span>
                                <span className="truncate font-medium">{lesson.title}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{lesson.flashcardCount || 0} flashcards</span>
                                {lesson.lessonType ? <span>· {lesson.lessonType}</span> : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {lesson.completed ? (
                                <Badge variant="secondary" className="rounded-full gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Done
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="rounded-full">Open</Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/70 p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Next actions
                </div>
                <div className="space-y-3">
                  <Button
                    className="w-full justify-start rounded-2xl"
                    onClick={handleStudyFlashcards}
                    disabled={initFlashcards.isPending}
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    Review course flashcards
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start rounded-2xl"
                    onClick={() => navigate("/knowledge-graph")}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    Open knowledge graph
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border-border/70 p-5">
              <div className="space-y-4">
                <div className="text-sm font-semibold">Study summary</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lesson completion</div>
                    <div className="mt-1 text-2xl font-semibold">{courseProgress}%</div>
                    <div className="mt-2"><Progress value={courseProgress} /></div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Flashcard readiness</div>
                    <div className="mt-1 text-2xl font-semibold">{reviewCoverage}%</div>
                    <div className="mt-2"><Progress value={reviewCoverage} /></div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-border/70 p-5">
              <div className="space-y-3">
                <div className="text-sm font-semibold">Review status</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cards due now</span>
                    <span className="font-medium">{dueForCourse}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cards mastered</span>
                    <span className="font-medium">{masteredForCourse}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cards in rotation</span>
                    <span className="font-medium">{courseFlashcards.length - masteredForCourse}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
