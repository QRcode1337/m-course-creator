import { useLocation } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Loader2, Layers } from "lucide-react";

export default function Library() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: courses, isLoading } = trpc.courses.list.useQuery(undefined, {
    enabled: !!user,
  });

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container py-8 md:py-16">
        <div className="space-y-8 md:space-y-12">
          {/* Page Title */}
          <div className="flex items-start gap-4 md:gap-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-primary flex-shrink-0" />
            <div className="space-y-2 md:space-y-4">
              <h2 className="text-2xl md:text-4xl font-bold">My Library</h2>
              <div className="border-t-2 border-current w-16" />
              <p className="text-lg text-muted-foreground">
                Your generated courses and learning progress
              </p>
            </div>
          </div>

          {/* Empty State */}
          {!courses || courses.length === 0 ? (
            <Card className="border-2 border-current p-16 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 bg-muted mx-auto flex items-center justify-center">
                  <Layers className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold">No courses yet</h3>
                <p className="text-muted-foreground">
                  Create your first course to start your learning journey
                </p>
                <Button onClick={() => navigate("/")}>Create Course</Button>
              </div>
            </Card>
          ) : (
            /* Course Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: any) => (
                <Card
                  key={course.id}
                  className="border-2 border-current hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 bg-primary flex-shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {course.chapters?.length || 0} chapters
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold line-clamp-2">{course.title}</h3>
                      <div className="border-t-2 border-current w-8" />
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {new Date(course.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
