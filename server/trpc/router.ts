import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { coursesRouter } from "./routers/courses";
import { lessonsRouter } from "./routers/lessons";
import { quizzesRouter } from "./routers/quizzes";
import { flashcardsRouter } from "./routers/flashcards";
import { settingsRouter } from "./routers/settings";
import { knowledgeGraphRouter } from "./routers/knowledge-graph";
import { mediaRouter } from "./routers/media";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  courses: coursesRouter,
  lessons: lessonsRouter,
  quizzes: quizzesRouter,
  flashcards: flashcardsRouter,
  settings: settingsRouter,
  knowledgeGraph: knowledgeGraphRouter,
  media: mediaRouter,
});

export type AppRouter = typeof appRouter;
