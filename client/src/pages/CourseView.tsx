import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { useStyleTheme } from "../contexts/StyleThemeContext";
import { toast } from "sonner";
import { getApiUrl } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Loader2, Palette, Layers, Brain, Download, Image } from "lucide-react";

const STYLE_THEMES: Record<string, string> = {
  /* style theme names mapped to labels */
};

export default function CourseView() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const { styleTheme, setStyleTheme } = useStyleTheme();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data: course, isLoading } = trpc.courses.getById.useQuery(
    { courseId },
    { enabled: !!user && !!courseId }
  );

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

  const totalFlashcards = course?.chapters?.reduce(
    (acc: number, ch: any) =>
      acc + (ch.lessons?.reduce((la: number, l: any) => la + (l.flashcardCount || 0), 0) || 0),
    0
  ) || 0;

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
      {/* Header */}
      <header className="border-b-2 border-current">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Course Creator</h1>
            <div className="flex items-center gap-4">
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
              <Button variant="outline" onClick={() => navigate("/")}>
                Create Course
              </Button>
              <Button variant="outline" onClick={() => navigate("/library")}>
                My Library
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Course Hero */}
      <div className="border-b-2 border-current bg-muted/30">
        <div className="container py-16">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-1">
              <div className="w-16 h-16 bg-primary" />
            </div>
            <div className="col-span-12 lg:col-span-11 space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold">{course.title}</h1>
                <div className="border-t-2 border-current w-24" />
              </div>
              {course.description && (
                <p className="text-xl text-muted-foreground max-w-3xl">
                  {course.description}
                </p>
              )}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm uppercase tracking-wide font-bold">
                  <Layers className="w-4 h-4" />
                  <span>{course.chapters?.length || 0} Chapters</span>
                </div>
                {totalFlashcards > 0 && (
                  <div className="flex items-center gap-2 text-sm uppercase tracking-wide font-bold text-primary">
                    <Brain className="w-4 h-4" />
                    <span>{totalFlashcards} Flashcards</span>
                  </div>
                )}
                {totalFlashcards > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleStudyFlashcards}
                    disabled={initFlashcards.isPending}
                  >
                    {initFlashcards.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Study All
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateAllImages.mutate({ courseId, skipExisting: true })}
                  disabled={generateAllImages.isPending}
                >
                  {generateAllImages.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Images...
                    </>
                  ) : (
                    <>
                      <Image className="w-4 h-4 mr-2" />
                      Generate All Images
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <main className="container py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Course Content</h2>
              <div className="border-t-2 border-current w-16" />
            </div>
            <div className="space-y-6">
              {course.chapters?.map((chapter: any, chapterIdx: number) => (
                <Card key={chapter.id} className="border-2 border-current">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {chapterIdx + 1}
                      </div>
                      <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-bold">{chapter.title}</h3>
                        {chapter.description && (
                          <p className="text-sm text-muted-foreground">{chapter.description}</p>
                        )}
                      </div>
                    </div>
                    {chapter.lessons && (
                      <div className="ml-12 space-y-2">
                        {chapter.lessons.map((lesson: any) => (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer rounded transition-colors"
                            onClick={() => navigate(`/lesson/${lesson.id}`)}
                          >
                            <div className="w-2 h-2 bg-current rounded-full flex-shrink-0" />
                            <span className="text-sm font-medium">{lesson.title}</span>
                            {lesson.completed && (
                              <span className="text-xs text-green-600 font-bold ml-auto">
                                Completed
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-2 border-current p-6 space-y-4">
              <h3 className="font-bold text-lg">Course Progress</h3>
              <div className="border-t-2 border-current w-8" />
              <p className="text-sm text-muted-foreground">
                Track your progress through each chapter and lesson.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
