import { getCoursesTree } from "../../lib/course-tree";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const knowledgeGraphRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    const courses = await getCoursesTree(ctx.db);
    const nodes: any[] = [];
    const edges: any[] = [];

    for (const course of courses) {
      const lessons = course.chapters.flatMap((c: any) => c.lessons || []);
      const completed = lessons.length > 0 ? lessons.filter((l: any) => l.completed).length : 0;
      const progress = lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;

      nodes.push({
        id: course.id,
        label: course.title,
        type: "course",
        courseId: course.id,
        completed: progress === 100,
        progress,
      });

      for (const chapter of course.chapters as any[]) {
        nodes.push({
          id: chapter.id,
          label: chapter.title,
          type: "chapter",
          courseId: course.id,
        });
        edges.push({ source: course.id, target: chapter.id, type: "child" });

        for (const lesson of chapter.lessons || []) {
          nodes.push({
            id: lesson.id,
            label: lesson.title,
            type: "lesson",
            courseId: course.id,
            completed: lesson.completed,
          });
          edges.push({ source: chapter.id, target: lesson.id, type: "child" });
        }
      }
    }

    return { nodes, edges };
  }),

  getRecommendations: publicProcedure.query(async ({ ctx }) => {
    const courses = await getCoursesTree(ctx.db);
    if (courses.length === 0) return [];

    return courses.slice(0, 3).map((course) => ({
      title: `Finish: ${course.title}`,
      description: "Complete remaining lessons to reinforce retention.",
    }));
  }),
});
