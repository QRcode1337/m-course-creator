# Course Creator — Standalone Design Spec

## Overview

Rebuild the Manus "Personal Course Creator" as a standalone, self-hosted application. AI-powered course generation from any topic with flashcards, quizzes, knowledge graphs, and spaced repetition.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Routing (client) | Wouter |
| State/Data | TanStack React Query + tRPC |
| Backend | Express.js + tRPC |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Auth | bcrypt + HTTP-only cookie sessions |
| AI | Multi-provider (Anthropic, OpenAI, OpenRouter, Grok) |
| Graph viz | React Flow |
| Drag & drop | DnD Kit |
| Markdown | react-markdown + remark-gfm |
| PDF export | @react-pdf/renderer or jsPDF |

## Project Structure

```
manus-course-creator/
├── package.json              # workspace root
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── utils/trpc.ts
│       ├── hooks/useAuth.ts
│       ├── contexts/
│       │   ├── ThemeContext.tsx
│       │   └── StyleThemeContext.tsx
│       ├── components/
│       │   ├── ui/              # shadcn/ui components
│       │   ├── CourseSetupWizard.tsx
│       │   ├── Flashcard.tsx
│       │   ├── Quiz.tsx
│       │   ├── LessonContent.tsx
│       │   ├── GlossaryTerm.tsx
│       │   ├── NodeGraphBackground.tsx
│       │   ├── MediaGenerationDialog.tsx
│       │   ├── RelatedTopics.tsx
│       │   ├── SortableIllustration.tsx
│       │   └── ErrorBoundary.tsx
│       └── pages/
│           ├── Home.tsx
│           ├── Library.tsx
│           ├── CourseView.tsx
│           ├── LessonView.tsx
│           ├── FlashcardLibrary.tsx
│           ├── FlashcardStudy.tsx
│           ├── StudyCalendar.tsx
│           ├── Settings.tsx
│           ├── KnowledgeGraph.tsx
│           ├── GraphView.tsx
│           └── NotFound.tsx
└── server/
    ├── index.ts               # Express + tRPC server entry
    ├── db/
    │   ├── schema.ts          # Drizzle schema
    │   ├── index.ts           # DB connection
    │   └── migrate.ts         # Migration runner
    ├── trpc/
    │   ├── context.ts         # tRPC context (auth)
    │   ├── router.ts          # Root router
    │   └── routers/
    │       ├── auth.ts
    │       ├── courses.ts
    │       ├── lessons.ts
    │       ├── quizzes.ts
    │       ├── flashcards.ts
    │       ├── settings.ts
    │       ├── knowledgeGraph.ts
    │       └── media.ts
    └── ai/
        ├── types.ts           # AIProvider interface
        ├── factory.ts         # Provider factory
        ├── providers/
        │   ├── anthropic.ts
        │   ├── openai.ts
        │   ├── openrouter.ts
        │   └── grok.ts
        └── prompts/
            ├── courseGeneration.ts
            ├── quizGeneration.ts
            ├── lessonChat.ts
            └── mediaPrompts.ts
```

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE | |
| passwordHash | TEXT | bcrypt |
| name | TEXT | |
| createdAt | INTEGER | Unix timestamp |

### sessions
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| userId | TEXT FK | |
| token | TEXT UNIQUE | Secure random |
| expiresAt | INTEGER | |

### settings
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| userId | TEXT FK UNIQUE | |
| preferredProvider | TEXT | 'anthropic'|'openai'|'openrouter'|'grok' |
| anthropicApiKey | TEXT | Encrypted |
| openaiApiKey | TEXT | Encrypted |
| openrouterApiKey | TEXT | Encrypted |
| grokApiKey | TEXT | Encrypted |

### courses
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| userId | TEXT FK | |
| title | TEXT | |
| description | TEXT | |
| approach | TEXT | 'balanced'|'rigorous'|'accessible' |
| familiarityLevel | TEXT | |
| createdAt | INTEGER | |

### chapters
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| courseId | TEXT FK | |
| title | TEXT | |
| description | TEXT | |
| orderIndex | INTEGER | |

### lessons
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| chapterId | TEXT FK | |
| title | TEXT | |
| content | TEXT | Markdown |
| lessonType | TEXT | |
| completed | INTEGER | 0/1 |
| completedAt | INTEGER | |
| orderIndex | INTEGER | |

### glossaryTerms
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| lessonId | TEXT FK | |
| term | TEXT | |
| definition | TEXT | |

### quizzes
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| lessonId | TEXT FK | |
| createdAt | INTEGER | |

### quizQuestions
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| quizId | TEXT FK | |
| questionText | TEXT | |
| options | TEXT | JSON array |
| correctAnswer | TEXT | |
| explanation | TEXT | |

### flashcardReviews
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| glossaryTermId | TEXT FK | |
| userId | TEXT FK | |
| nextReviewDate | INTEGER | |
| interval | REAL | Days |
| easeFactor | REAL | SM-2 ease |
| repetitions | INTEGER | |

### illustrations
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| lessonId | TEXT FK | |
| imageUrl | TEXT | |
| prompt | TEXT | |
| orderIndex | INTEGER | |

## API Routes (tRPC)

### auth
- `auth.register` — mutation(email, password, name)
- `auth.login` — mutation(email, password)
- `auth.logout` — mutation()
- `auth.session` — query() → user | null

### courses
- `courses.list` — query() → Course[]
- `courses.getById` — query(courseId) → Course with chapters/lessons
- `courses.generate` — mutation(topic, approach?, familiarityLevel?, assessmentAnswers?) → { courseId }
- `courses.exportPdf` — mutation(courseId) → binary
- `courses.delete` — mutation(courseId)

### lessons
- `lessons.getById` — query(lessonId) → Lesson with glossary/illustrations
- `lessons.toggleComplete` — mutation(lessonId, completed)
- `lessons.regenerate` — mutation(lessonId)
- `lessons.chat` — mutation(lessonId, message, conversationHistory) → { message }
- `lessons.getCompleted` — query() → CompletedLesson[]

### quizzes
- `quizzes.getByLessonId` — query(lessonId) → { quiz, questions }
- `quizzes.generate` — mutation(lessonId)
- `quizzes.submit` — mutation(quizId, answers) → { score, results }

### flashcards
- `flashcards.getAll` — query() → FlashcardWithCourse[]
- `flashcards.getStats` — query() → { total, due, learning, mastered }
- `flashcards.getDue` — query() → DueFlashcard[]
- `flashcards.rate` — mutation(glossaryTermId, rating)
- `flashcards.initializeFromCourse` — mutation(courseId) → { initialized }

### settings
- `settings.get` — query() → Settings
- `settings.update` — mutation(settings)

### knowledgeGraph
- `knowledgeGraph.get` — query() → { nodes, edges }
- `knowledgeGraph.getRecommendations` — query() → Recommendation[]

### media
- `media.generate` — mutation(lessonId, prompt) → { imageUrl }

## AI Provider Interface

```typescript
interface AIProvider {
  generateCourse(params: {
    topic: string;
    approach?: string;
    familiarityLevel?: string;
    requirements?: string;
  }): Promise<GeneratedCourse>;

  generateQuiz(lessonContent: string, lessonTitle: string): Promise<GeneratedQuiz>;

  chat(message: string, lessonContent: string, history: ChatMessage[]): Promise<string>;

  regenerateLesson(title: string, chapterContext: string): Promise<string>;
}
```

Course generation returns structured JSON: title, description, chapters with lessons, glossary terms per lesson.

## Auth Flow

1. User registers with email/password
2. Password hashed with bcrypt (12 rounds)
3. Session token generated (crypto.randomUUID)
4. Token stored in HTTP-only, SameSite=Strict cookie
5. tRPC middleware reads cookie, looks up session, attaches user to context
6. Protected routes throw UNAUTHORIZED if no valid session

## Spaced Repetition (SM-2)

Flashcard rating maps to SM-2 quality:
- again → 0, hard → 2, good → 4, easy → 5

Update formula:
- If quality < 3: reset interval to 1, repetitions to 0
- If quality >= 3: interval = prev * easeFactor, repetitions++
- EaseFactor adjusted: EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
- Minimum EF: 1.3

## Client Routes

| Path | Page | Auth |
|------|------|------|
| / | Home | Optional |
| /library | Library | Required |
| /course/:id | CourseView | Required |
| /lesson/:id | LessonView | Required |
| /flashcards | FlashcardLibrary | Required |
| /flashcards/study | FlashcardStudy | Required |
| /calendar | StudyCalendar | Required |
| /settings | Settings | Required |
| /graph | GraphView | Required |
| /knowledge-graph | KnowledgeGraph | Required |
| /404 | NotFound | No |

## Dev Scripts

- `npm run dev` — starts client (Vite) + server (tsx watch) concurrently
- `npm run build` — builds client + compiles server
- `npm run db:push` — push schema to SQLite
- `npm run db:studio` — open Drizzle Studio
