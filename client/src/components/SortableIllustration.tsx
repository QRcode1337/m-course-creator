import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "./ui/button";
import { GripVertical, Trash2, RefreshCw } from "lucide-react";

interface Props {
  id: string;
  imageUrl: string;
  prompt: string;
  lessonTitle: string;
  onDelete: () => void;
  onRegenerate: () => void;
}

export function SortableIllustration({ id, imageUrl, prompt, onDelete, onRegenerate }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group border-2 border-current rounded-lg overflow-hidden">
      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button {...attributes} {...listeners} className="p-1 bg-black/50 rounded cursor-grab">
          <GripVertical className="w-4 h-4 text-white" />
        </button>
      </div>
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/50 hover:bg-black/70" onClick={onRegenerate}>
          <RefreshCw className="w-3 h-3 text-white" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/50 hover:bg-red-600" onClick={onDelete}>
          <Trash2 className="w-3 h-3 text-white" />
        </Button>
      </div>
      <img src={imageUrl} alt={prompt} className="w-full h-auto" />
      <div className="p-3 bg-muted/50">
        <p className="text-xs text-muted-foreground">{prompt}</p>
      </div>
    </div>
  );
}
