import { Switch, Route, useLocation } from "wouter";
import { ThemeProvider } from "./contexts/ThemeContext";
import { StyleThemeProvider } from "./contexts/StyleThemeContext";
import { Toaster } from "./components/ui/sonner";
import Header from "./components/Header";

import Home from "./pages/Home";
import Library from "./pages/Library";
import GraphView from "./pages/GraphView";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import FlashcardLibrary from "./pages/FlashcardLibrary";
import FlashcardStudy from "./pages/FlashcardStudy";
import StudyCalendar from "./pages/StudyCalendar";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import CourseView from "./pages/CourseView";
import LessonView from "./pages/LessonView";
import CreateCourse from "./pages/CreateCourse";
import ImportDocument from "./pages/ImportDocument";
import PreviewCourse from "./pages/PreviewCourse";
import NotFound from "./pages/NotFound";

function shouldShowHeader(pathname: string) {
  return !["/preview", "/graph", "/knowledge-graph", "/404"].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateCourse} />
      <Route path="/import" component={ImportDocument} />
      <Route path="/preview" component={PreviewCourse} />
      <Route path="/library" component={Library} />
      <Route path="/graph" component={GraphView} />
      <Route path="/knowledge-graph" component={KnowledgeGraph} />
      <Route path="/flashcards" component={FlashcardLibrary} />
      <Route path="/flashcards/study" component={FlashcardStudy} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/calendar-legacy" component={StudyCalendar} />
      <Route path="/settings" component={Settings} />
      <Route path="/course/:id" component={CourseView} />
      <Route path="/lesson/:id" component={LessonView} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppChrome() {
  const [pathname] = useLocation();

  return (
    <>
      {shouldShowHeader(pathname) ? <Header /> : null}
      <AppRoutes />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <StyleThemeProvider defaultTheme="light">
        <Toaster />
        <AppChrome />
      </StyleThemeProvider>
    </ThemeProvider>
  );
}
