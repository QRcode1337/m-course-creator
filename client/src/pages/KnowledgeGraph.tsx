import { useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "../utils/trpc";
import { useAuth } from "../hooks/useAuth";
import { useNodesState, useEdgesState, MarkerType } from "reactflow";
import ReactFlow from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Loader2, ArrowLeft, Layers, Trophy, Flame, Target } from "lucide-react";

export default function KnowledgeGraph() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: graph, isLoading: graphLoading } = trpc.knowledgeGraph.get.useQuery(undefined, { enabled: !!user });
  const { data: recommendations, isLoading: recsLoading } = trpc.knowledgeGraph.getRecommendations.useQuery(undefined, { enabled: !!user });

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!graph) return { initialNodes: [], initialEdges: [] };

    const nodes = graph.nodes.map((node: any, i: number) => {
      const isCourse = node.type === "course";
      const isCompleted = node.completed || false;
      const progress = node.progress || 0;

      return {
        id: node.id,
        type: isCourse ? "default" : "input",
        position: {
          x: isCourse ? (i % 3) * 300 : Math.random() * 800,
          y: isCourse ? Math.floor(i / 3) * 200 : Math.random() * 600,
        },
        data: {
          label: (
            <div className="text-center">
              <div className="font-semibold text-sm">{node.label}</div>
              {isCourse && <div className="text-xs text-muted-foreground mt-1">{progress}% complete</div>}
            </div>
          ),
        },
        style: {
          background: isCourse ? (isCompleted ? "#22c55e" : progress > 0 ? "#3b82f6" : "#6b7280") : "#8b5cf6",
          color: "white",
          border: "2px solid",
          borderColor: isCourse ? "#1e293b" : "#4c1d95",
          borderRadius: "8px",
          padding: "12px",
          minWidth: isCourse ? "180px" : "140px",
        },
      };
    });

    const edges = graph.edges.map((edge: any) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: edge.type === "child",
      style: {
        stroke: edge.type === "parent" ? "#8b5cf6" : edge.type === "child" ? "#3b82f6" : "#6b7280",
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.type === "parent" ? "#8b5cf6" : edge.type === "child" ? "#3b82f6" : "#6b7280",
      },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [graph]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_event: any, node: any) => {
      const courseId = graph?.nodes.find((n: any) => n.id === node.id)?.courseId;
      if (courseId) navigate(`/course/${courseId}`);
    },
    [graph, navigate]
  );

  if (loading || graphLoading || recsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) { navigate("/"); return null; }

  const iconMap: Record<string, any> = { Master: Flame, Finish: Trophy, Broaden: Target, Specialize: Layers };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />Home
              </Button>
              <h1 className="text-2xl font-bold">Knowledge Graph</h1>
            </div>
            <Button onClick={() => navigate("/library")}>My Library</Button>
          </div>
        </div>
      </header>

      <div className="container max-w-[1600px] py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
          {/* Recommendations Sidebar */}
          <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div>
              <h2 className="text-xl font-bold mb-4">Recommended Learning Paths</h2>
              <div className="space-y-4">
                {recommendations && recommendations.length > 0 ? (
                  recommendations.map((rec: any, i: number) => {
                    const Icon = Object.entries(iconMap).find(([key]) => rec.title.includes(key))?.[1] || Layers;
                    return (
                      <Card key={i} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-bold">{rec.title}</h3>
                              <p className="text-sm text-muted-foreground">{rec.description}</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground">Create more courses to see recommendations.</p>
                )}
              </div>
            </div>
          </div>

          {/* Graph */}
          <Card className="border-2 border-current" style={{ height: "calc(100vh - 200px)" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
