import { useLocation } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function GraphView() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: courses } = trpc.courses.list.useQuery(undefined, { enabled: !!user });
  const coursesList = (courses || []) as any[];

  // Build graph nodes and edges from courses
  const nodes: any[] = [];
  const edges: any[] = [];
  if (coursesList.length > 0) {
    coursesList.forEach((course: any) => {
      nodes.push({ id: course.id, type: "course", label: course.title, courseId: course.id });
      course.chapters?.forEach((chapter: any) => {
        nodes.push({ id: chapter.id, type: "chapter", label: chapter.title, courseId: course.id, chapterId: chapter.id });
        edges.push({ source: course.id, target: chapter.id });
        chapter.lessons?.forEach((lesson: any) => {
          nodes.push({ id: lesson.id, type: "lesson", label: lesson.title, lessonId: lesson.id });
          edges.push({ source: chapter.id, target: lesson.id });
        });
      });
    });
  }

  const handleNodeClick = (node: any) => {
    if (node.type === "course" && node.courseId) {
      navigate(`/course/${node.courseId}`);
    } else if (node.type === "chapter" && node.courseId && node.chapterId) {
      const course = coursesList.find((c: any) => c.id === node.courseId) as any;
      const chapter = (course?.chapters || []).find((ch: any) => ch.id === node.chapterId) as any;
      if (chapter && Array.isArray(chapter.lessons) && chapter.lessons.length > 0) {
        navigate(`/lesson/${chapter.lessons[0].id}`);
      }
    } else if (node.type === "lesson" && node.lessonId) {
      navigate(`/lesson/${node.lessonId}`);
    }
  };

  const isLoading = !courses;
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />Back
            </Button>
            <h1 className="text-2xl font-bold">Knowledge Graph</h1>
          </div>
          <div className="text-sm text-white/60">
            {nodes.length} nodes · {edges.length} connections
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-20 right-6 z-10 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        <h3 className="text-sm font-bold mb-3">Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#3b82f6] border-2 border-white" />
            <span className="text-xs">Course</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#8b5cf6] border-2 border-white" />
            <span className="text-xs">Chapter</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ec4899] border-2 border-white" />
            <span className="text-xs">Lesson</span>
          </div>
        </div>
      </div>

      {/* Canvas-based graph visualization would go here */}
      <div className="pt-20 h-screen flex items-center justify-center text-white/40">
        <p>Interactive 3D force-directed graph renders here</p>
      </div>
    </div>
  );
}
