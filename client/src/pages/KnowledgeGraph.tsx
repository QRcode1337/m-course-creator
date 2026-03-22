import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { CourseForceGraph } from "../components/CourseForceGraph";

export default function KnowledgeGraph() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: graph, isLoading: graphLoading } = trpc.knowledgeGraph.get.useQuery(undefined, { enabled: !!user });
  const { data: recommendations, isLoading: recsLoading } = trpc.knowledgeGraph.getRecommendations.useQuery(undefined, { enabled: !!user });

  if (loading || graphLoading || recsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b15] text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  if (!graph) return null;

  return (
    <div className="min-h-screen bg-[#070b15] text-white">
      <div className="container py-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Button variant="ghost" className="gap-2 rounded-full text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Knowledge graph</div>
              <h1 className="text-3xl font-semibold">Obsidian-style course map</h1>
            </div>
          </div>
        </div>

        <CourseForceGraph
          graph={graph}
          recommendations={recommendations}
          onOpenNode={(node) => {
            if (node.type === "lesson") {
              navigate(`/lesson/${node.id}`);
              return;
            }
            if (node.courseId) {
              navigate(`/course/${node.courseId}`);
              return;
            }
            navigate(`/course/${node.id}`);
          }}
        />
      </div>
    </div>
  );
}
