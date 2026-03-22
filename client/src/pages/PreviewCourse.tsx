import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Download,
  Layers,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { trpc } from "../utils/trpc";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";

interface KeyTerm {
  term: string;
  definition: string;
}

interface PreviewLesson {
  title: string;
  content: string;
  glossaryTerms: KeyTerm[];
}

interface PreviewChapter {
  title: string;
  description: string;
  lessons: PreviewLesson[];
}

interface PreviewTopic {
  title: string;
  description?: string;
}

interface PreviewData {
  title: string;
  description: string;
  chapters: PreviewChapter[];
  relatedTopics?: PreviewTopic[];
}

interface PreviewConfig {
  approach: "balanced" | "rigorous" | "easy";
  courseLength: "short" | "medium" | "comprehensive";
  lessonsPerChapter: "few" | "moderate" | "many";
  contentDepth: "introductory" | "intermediate" | "advanced";
}

export default function PreviewCourse() {
  const [, navigate] = useLocation();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewTopic, setPreviewTopic] = useState("");
  const [previewConfig, setPreviewConfig] = useState<PreviewConfig | null>(null);
  const [previewArchitecture, setPreviewArchitecture] = useState<unknown>(null);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState({ chapter: 0, lesson: 0 });
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  const createCourse = trpc.courses.generate.useMutation({
    onSuccess: (data) => {
      sessionStorage.removeItem("coursePreview");
      sessionStorage.removeItem("coursePreviewTopic");
      sessionStorage.removeItem("coursePreviewConfig");
      sessionStorage.removeItem("coursePreviewArchitecture");
      navigate(`/course/${data.courseId}`);
    },
  });

  useEffect(() => {
    const stored = sessionStorage.getItem("coursePreview");
    const storedTopic = sessionStorage.getItem("coursePreviewTopic");
    const storedConfig = sessionStorage.getItem("coursePreviewConfig");
    const storedArchitecture = sessionStorage.getItem("coursePreviewArchitecture");

    if (!stored) {
      navigate("/create");
      return;
    }

    try {
      setPreviewData(JSON.parse(stored));
      setPreviewTopic(storedTopic || "");
      setPreviewConfig(storedConfig ? JSON.parse(storedConfig) : null);
      setPreviewArchitecture(storedArchitecture ? JSON.parse(storedArchitecture) : null);
    } catch {
      navigate("/create");
    }
  }, [navigate]);

  const selectedLesson = useMemo(() => {
    if (!previewData) return null;
    const chapter = previewData.chapters[selectedLessonIndex.chapter];
    return chapter?.lessons[selectedLessonIndex.lesson] ?? null;
  }, [previewData, selectedLessonIndex]);

  const allKeyTerms = useMemo(() => {
    if (!previewData) return [];
    return previewData.chapters.flatMap((chapter) =>
      chapter.lessons.flatMap((lesson) => lesson.glossaryTerms),
    );
  }, [previewData]);

  const totalLessons = useMemo(() => {
    if (!previewData) return 0;
    return previewData.chapters.reduce((count, chapter) => count + chapter.lessons.length, 0);
  }, [previewData]);

  const handleFlipCard = useCallback(() => {
    setCardFlipped((prev) => !prev);
  }, []);

  const handleNextCard = useCallback(() => {
    setCardFlipped(false);
    setCurrentCardIndex((prev) => (allKeyTerms.length ? (prev + 1) % allKeyTerms.length : 0));
  }, [allKeyTerms.length]);

  const handlePrevCard = useCallback(() => {
    setCardFlipped(false);
    setCurrentCardIndex((prev) => (allKeyTerms.length ? (prev - 1 + allKeyTerms.length) % allKeyTerms.length : 0));
  }, [allKeyTerms.length]);

  const handleCreateCourse = () => {
    if (!previewTopic || !previewConfig) {
      navigate("/create");
      return;
    }

    createCourse.mutate({
      topic: previewTopic,
      approach: previewConfig.approach,
      familiarityLevel: previewConfig.contentDepth,
      architecture: previewArchitecture ?? undefined,
      assessmentAnswers: [
        { question: "Preferred course length", answer: previewConfig.courseLength },
        { question: "Lessons per chapter preference", answer: previewConfig.lessonsPerChapter },
      ],
    });
  };

  if (!previewData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-24 text-center">
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <Link href="/create">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Generator
          </Button>
        </Link>

        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 w-5 h-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">
                Preview for "{previewTopic}"
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the outline, sample lesson content, key terms, and study surfaces before saving the full course.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Preview</Badge>
                  {previewConfig && <Badge variant="outline">{previewConfig.contentDepth}</Badge>}
                </div>
                <CardTitle className="text-2xl">{previewData.title}</CardTitle>
                <CardDescription className="mt-2">{previewData.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>{previewData.chapters.length} chapters</span>
                  <span>{totalLessons} lessons</span>
                  <span>{allKeyTerms.length} key terms</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>Choose a lesson to inspect the generated material.</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" defaultValue={["chapter-0"]} className="w-full">
                  {previewData.chapters.map((chapter, chapterIndex) => (
                    <AccordionItem key={chapterIndex} value={`chapter-${chapterIndex}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-medium text-primary">
                            {chapterIndex + 1}
                          </div>
                          <div>
                            <div className="font-medium">{chapter.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {chapter.lessons.length} lessons
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-11">
                          {chapter.description && (
                            <p className="mb-4 text-sm text-muted-foreground">{chapter.description}</p>
                          )}
                          {chapter.lessons.map((lesson, lessonIndex) => {
                            const isSelected =
                              selectedLessonIndex.chapter === chapterIndex
                              && selectedLessonIndex.lesson === lessonIndex;
                            return (
                              <div
                                key={lessonIndex}
                                className={`group flex cursor-pointer items-center gap-3 rounded-lg p-3 ${
                                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                                }`}
                                onClick={() => {
                                  setSelectedLessonIndex({ chapter: chapterIndex, lesson: lessonIndex });
                                  setCardFlipped(false);
                                }}
                              >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                  <span className="text-xs">{lessonIndex + 1}</span>
                                </div>
                                <span className="flex-1 text-sm">{lesson.title}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {selectedLesson && (
              <Card>
                <CardHeader>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Ch. {selectedLessonIndex.chapter + 1}, Lesson {selectedLessonIndex.lesson + 1}
                    </Badge>
                  </div>
                  <CardTitle>{selectedLesson.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedLesson.content}
                    </ReactMarkdown>
                  </div>

                  {selectedLesson.glossaryTerms.length > 0 && (
                    <div className="mt-8 border-t pt-6">
                      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Key Terms ({selectedLesson.glossaryTerms.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedLesson.glossaryTerms.map((term) => (
                          <div key={term.term} className="rounded-lg bg-muted/50 p-3">
                            <span className="text-sm font-medium">{term.term}</span>
                            <span className="text-sm text-muted-foreground"> - {term.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
              <CardContent className="space-y-4 pt-6">
                <div className="text-center">
                  <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
                  <h3 className="text-lg font-semibold mb-1">Turn preview into a saved course</h3>
                  <p className="text-sm text-muted-foreground">
                    Keep this exact outline and generate the persisted course with chat, flashcards, quizzes, and PDF export.
                  </p>
                </div>
                <Button className="w-full gap-2" onClick={handleCreateCourse} disabled={createCourse.isPending}>
                  {createCourse.isPending ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Creating Course...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Create Full Course
                    </>
                  )}
                </Button>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <Link href="/create">
                    <RotateCcw className="h-4 w-4" />
                    Adjust Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  Flashcard Preview
                </CardTitle>
                <CardDescription>{allKeyTerms.length} cards from generated key terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allKeyTerms.length > 0 ? (
                  <>
                    <div
                      className="relative flex h-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-primary/20 bg-muted/30 p-6 transition-all hover:border-primary/40"
                      onClick={handleFlipCard}
                    >
                      <div className="text-center">
                        {!cardFlipped ? (
                          <>
                            <p className="mb-2 text-lg font-semibold">{allKeyTerms[currentCardIndex]?.term}</p>
                            <p className="text-xs text-muted-foreground">Click to reveal definition</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm leading-relaxed">{allKeyTerms[currentCardIndex]?.definition}</p>
                            <p className="mt-2 text-xs text-muted-foreground">Click to show term</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" onClick={handlePrevCard}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentCardIndex + 1} / {allKeyTerms.length}
                      </span>
                      <Button variant="ghost" size="sm" onClick={handleNextCard}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No key terms were generated for this preview.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Full Course Unlocks
                </CardTitle>
                <CardDescription>Preview shows the structure. The full course enables the study loop.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: MessageCircle, label: "Lesson AI chat", desc: "Ask questions inside every lesson with context." },
                  { icon: Layers, label: "Spaced repetition", desc: "Generate and review flashcards across the course." },
                  { icon: Download, label: "PDF export", desc: "Download the course as a clean PDF." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {previewData.relatedTopics && previewData.relatedTopics.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Related Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {previewData.relatedTopics.map((topic) => (
                    <div key={topic.title} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{topic.title}</p>
                      {topic.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{topic.description}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
