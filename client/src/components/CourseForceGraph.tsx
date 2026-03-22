import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type GraphNode = {
  id: string;
  label: string;
  type: "course" | "chapter" | "lesson";
  courseId?: string;
  completed?: boolean;
  progress?: number;
};

type GraphEdge = {
  source: string;
  target: string;
  type?: string;
};

type Recommendation = {
  title: string;
  description: string;
};

type SimulationNode = GraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type Props = {
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  recommendations?: Recommendation[];
  onOpenNode: (node: GraphNode) => void;
};

const NODE_STYLE = {
  course: { color: "#7dd3fc", glow: "rgba(125, 211, 252, 0.45)", radius: 10 },
  chapter: { color: "#a78bfa", glow: "rgba(167, 139, 250, 0.32)", radius: 7 },
  lesson: { color: "#f59e0b", glow: "rgba(245, 158, 11, 0.22)", radius: 4.5 },
} as const;

function hashPosition(id: string, spread: number) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = ((hash << 5) - hash + id.charCodeAt(index)) | 0;
  }
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const radius = 120 + (Math.abs(hash) % spread);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function CourseForceGraph({ graph, recommendations = [], onOpenNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationNodesRef = useRef<Map<string, SimulationNode>>(new Map());
  const dragStateRef = useRef<{
    nodeId: string | null;
    mode: "pan" | "node" | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    nodeId: null,
    mode: null,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Record<GraphNode["type"], boolean>>({
    course: true,
    chapter: true,
    lesson: true,
  });

  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const selectedNode = selectedId ? nodeMap.get(selectedId) ?? null : null;
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    graph.edges.forEach((edge) => {
      const source = map.get(edge.source) ?? new Set<string>();
      source.add(edge.target);
      map.set(edge.source, source);

      const target = map.get(edge.target) ?? new Set<string>();
      target.add(edge.source);
      map.set(edge.target, target);
    });
    return map;
  }, [graph.edges]);

  const selectedNeighborhood = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const direct = adjacency.get(selectedId) ?? new Set<string>();
    return new Set<string>([selectedId, ...direct]);
  }, [adjacency, selectedId]);

  const matchingIds = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) return new Set<string>();
    return new Set(
      graph.nodes
        .filter((node) => node.label.toLowerCase().includes(normalized))
        .map((node) => node.id),
    );
  }, [deferredSearch, graph.nodes]);

  useEffect(() => {
    const previous = simulationNodesRef.current;
    const next = new Map<string, SimulationNode>();

    graph.nodes.forEach((node) => {
      const existing = previous.get(node.id);
      const base = NODE_STYLE[node.type];
      if (existing) {
        next.set(node.id, {
          ...existing,
          ...node,
          radius: base.radius,
        });
        return;
      }

      const seeded = hashPosition(node.id, node.type === "course" ? 240 : node.type === "chapter" ? 180 : 110);
      next.set(node.id, {
        ...node,
        x: seeded.x,
        y: seeded.y,
        vx: 0,
        vy: 0,
        radius: base.radius,
      });
    });

    simulationNodesRef.current = next;
  }, [graph.nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const toScreen = (x: number, y: number) => {
      const { x: cameraX, y: cameraY, scale } = cameraRef.current;
      return {
        x: canvas.clientWidth / 2 + cameraX + x * scale,
        y: canvas.clientHeight / 2 + cameraY + y * scale,
      };
    };

    const visibleNodeIds = new Set(
      graph.nodes.filter((node) => visibleTypes[node.type]).map((node) => node.id),
    );

    const step = () => {
      resize();

      const nodes = Array.from(simulationNodesRef.current.values()).filter((node) => visibleNodeIds.has(node.id));
      const nodeLookup = new Map(nodes.map((node) => [node.id, node]));

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const other = nodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distSq = Math.max(dx * dx + dy * dy, 0.01);
          const force = 6200 / distSq;
          const angle = Math.atan2(dy, dx);
          const fx = Math.cos(angle) * force;
          const fy = Math.sin(angle) * force;
          node.vx -= fx;
          node.vy -= fy;
          other.vx += fx;
          other.vy += fy;
        }
      }

      graph.edges.forEach((edge) => {
        const source = nodeLookup.get(edge.source);
        const target = nodeLookup.get(edge.target);
        if (!source || !target) return;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.max(Math.hypot(dx, dy), 1);
        const desired = source.type === "course" || target.type === "course" ? 180 : 120;
        const spring = (distance - desired) * 0.0022;
        const fx = (dx / distance) * spring;
        const fy = (dy / distance) * spring;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      nodes.forEach((node) => {
        if (dragStateRef.current.nodeId === node.id) return;
        node.vx += -node.x * 0.0005;
        node.vy += -node.y * 0.0005;
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
      });

      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      const gradient = context.createLinearGradient(0, 0, canvas.clientWidth, canvas.clientHeight);
      gradient.addColorStop(0, "#070b15");
      gradient.addColorStop(0.55, "#0f1729");
      gradient.addColorStop(1, "#05070c");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      context.fillStyle = "rgba(148, 163, 184, 0.08)";
      const { x: cameraX, y: cameraY, scale } = cameraRef.current;
      const grid = 52 * scale;
      const offsetX = ((cameraX % grid) + grid) % grid;
      const offsetY = ((cameraY % grid) + grid) % grid;
      for (let x = offsetX; x < canvas.clientWidth; x += grid) {
        for (let y = offsetY; y < canvas.clientHeight; y += grid) {
          context.beginPath();
          context.arc(x, y, 1.1, 0, Math.PI * 2);
          context.fill();
        }
      }

      graph.edges.forEach((edge) => {
        const source = nodeLookup.get(edge.source);
        const target = nodeLookup.get(edge.target);
        if (!source || !target) return;
        const from = toScreen(source.x, source.y);
        const to = toScreen(target.x, target.y);
        const emphasized = !selectedId || (selectedNeighborhood.has(source.id) && selectedNeighborhood.has(target.id));
        const searched = matchingIds.size > 0 && (matchingIds.has(source.id) || matchingIds.has(target.id));
        context.strokeStyle = searched
          ? "rgba(125, 211, 252, 0.22)"
          : emphasized
            ? "rgba(148, 163, 184, 0.16)"
            : "rgba(71, 85, 105, 0.08)";
        context.lineWidth = searched ? 1.2 : emphasized ? 0.9 : 0.6;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      });

      nodes.forEach((node) => {
        const style = NODE_STYLE[node.type];
        const point = toScreen(node.x, node.y);
        const selected = selectedId === node.id;
        const hovered = hoveredId === node.id;
        const matched = matchingIds.size === 0 || matchingIds.has(node.id);
        const faded = (matchingIds.size > 0 && !matched) || (selectedId && !selectedNeighborhood.has(node.id));
        const radius = node.radius * scale * (selected ? 1.25 : hovered ? 1.15 : 1);

        context.beginPath();
        context.fillStyle = faded ? "rgba(71, 85, 105, 0.5)" : style.glow;
        context.arc(point.x, point.y, radius * 2.8, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.fillStyle = faded ? "rgba(100, 116, 139, 0.85)" : style.color;
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();

        if (node.completed) {
          context.beginPath();
          context.strokeStyle = "rgba(74, 222, 128, 0.9)";
          context.lineWidth = 1.5;
          context.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
          context.stroke();
        }

        const shouldLabel = node.type === "course" || selected || hovered || matchingIds.has(node.id);
        if (shouldLabel) {
          context.fillStyle = faded ? "rgba(148, 163, 184, 0.55)" : "#e2e8f0";
          context.font = `${node.type === "course" ? 13 : 11}px ui-sans-serif, system-ui`;
          context.textAlign = "center";
          context.fillText(node.label, point.x, point.y - radius - 10);
        }
      });

      animationFrame = window.requestAnimationFrame(step);
    };

    step();
    window.addEventListener("resize", resize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [graph, hoveredId, matchingIds, selectedId, selectedNeighborhood, visibleTypes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const { x, y, scale } = cameraRef.current;
      return {
        x: (clientX - rect.left - rect.width / 2 - x) / scale,
        y: (clientY - rect.top - rect.height / 2 - y) / scale,
      };
    };

    const hitTest = (clientX: number, clientY: number) => {
      const world = toWorld(clientX, clientY);
      const nodes = Array.from(simulationNodesRef.current.values()).filter((node) => visibleTypes[node.type]);
      return nodes.find((node) => Math.hypot(world.x - node.x, world.y - node.y) <= node.radius * 3) ?? null;
    };

    const onPointerDown = (event: PointerEvent) => {
      const hit = hitTest(event.clientX, event.clientY);
      dragStateRef.current = {
        nodeId: hit?.id ?? null,
        mode: hit ? "node" : "pan",
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (state.mode === "node" && state.nodeId) {
        const node = simulationNodesRef.current.get(state.nodeId);
        if (!node) return;
        const world = toWorld(event.clientX, event.clientY);
        node.x = world.x;
        node.y = world.y;
        node.vx = 0;
        node.vy = 0;
        state.moved = true;
        return;
      }

      if (state.mode === "pan") {
        const dx = event.clientX - state.startX;
        const dy = event.clientY - state.startY;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          state.moved = true;
        }
        cameraRef.current.x += dx;
        cameraRef.current.y += dy;
        state.startX = event.clientX;
        state.startY = event.clientY;
        return;
      }

      const hovered = hitTest(event.clientX, event.clientY);
      setHoveredId((current) => (current === hovered?.id ? current : hovered?.id ?? null));
    };

    const onPointerUp = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.moved) {
        const hit = hitTest(event.clientX, event.clientY);
        setSelectedId(hit?.id ?? null);
      }
      dragStateRef.current = {
        nodeId: null,
        mode: null,
        startX: 0,
        startY: 0,
        moved: false,
      };
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const { x, y, scale } = cameraRef.current;
      const pointerX = event.clientX - rect.left - rect.width / 2 - x;
      const pointerY = event.clientY - rect.top - rect.height / 2 - y;
      const nextScale = Math.min(2.4, Math.max(0.55, scale * (event.deltaY > 0 ? 0.92 : 1.08)));
      cameraRef.current.scale = nextScale;
      cameraRef.current.x -= pointerX * (nextScale - scale);
      cameraRef.current.y -= pointerY * (nextScale - scale);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [visibleTypes]);

  const selectedLinks = useMemo(() => {
    if (!selectedNode) return [];
    return graph.edges
      .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      .map((edge) => nodeMap.get(edge.source === selectedNode.id ? edge.target : edge.source))
      .filter(Boolean) as GraphNode[];
  }, [graph.edges, nodeMap, selectedNode]);

  return (
    <div className="relative h-[calc(100vh-5rem)] min-h-[720px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0b1020] shadow-[0_40px_120px_rgba(2,6,23,0.45)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.08),transparent_26%)]" />

      <div className="absolute left-5 top-5 z-10 w-[min(360px,calc(100%-2.5rem))] space-y-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/72 p-4 backdrop-blur-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Vault graph
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search graph nodes"
                className="border-white/10 bg-slate-900/90 pl-9 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["course", "chapter", "lesson"] as GraphNode["type"][]).map((type) => (
                <Button
                  key={type}
                  variant={visibleTypes[type] ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-full border border-white/10 bg-slate-900/65 text-slate-100 hover:bg-slate-800"
                  onClick={() => setVisibleTypes((current) => ({ ...current, [type]: !current[type] }))}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-5 top-5 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          className="border-white/10 bg-slate-950/72 text-slate-100 backdrop-blur-xl"
          onClick={() => {
            cameraRef.current.scale = Math.min(2.4, cameraRef.current.scale * 1.15);
          }}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-white/10 bg-slate-950/72 text-slate-100 backdrop-blur-xl"
          onClick={() => {
            cameraRef.current.scale = Math.max(0.55, cameraRef.current.scale * 0.87);
          }}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-5 right-5 z-10 w-[320px] max-w-[calc(100%-2.5rem)] space-y-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/72 p-4 text-slate-100 backdrop-blur-xl">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{selectedNode.type}</div>
                <h3 className="mt-2 text-xl font-semibold">{selectedNode.label}</h3>
                {selectedNode.type === "course" ? (
                  <p className="mt-2 text-sm text-slate-400">{selectedNode.progress ?? 0}% complete</p>
                ) : null}
              </div>
              {selectedLinks.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Linked nodes</div>
                  <div className="space-y-1">
                    {selectedLinks.slice(0, 6).map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5"
                        onClick={() => setSelectedId(node.id)}
                      >
                        {node.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <Button className="w-full rounded-full" onClick={() => onOpenNode(selectedNode)}>
                Open node
              </Button>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Suggestions</div>
              {recommendations.map((rec, index) => (
                <div key={`${rec.title}-${index}`} className="rounded-xl bg-white/5 px-3 py-3">
                  <div className="font-medium">{rec.title}</div>
                  <div className="mt-1 text-sm text-slate-400">{rec.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Inspector</div>
              <p className="text-sm text-slate-400">Select a node to focus its neighborhood and open the linked course or lesson.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
