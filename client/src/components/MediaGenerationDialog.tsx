import { useState } from "react";
import { trpc } from "../utils/trpc";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Loader2, X } from "lucide-react";

interface Props {
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}

export function MediaGenerationDialog({ lessonId, lessonTitle, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const generateMutation = trpc.media.generate.useMutation();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      await generateMutation.mutateAsync({
        lessonId,
        prompt,
      });
      onClose();
    } catch (error) {
      console.error("Failed to generate media:", error);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Illustration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate an AI illustration for "{lessonTitle}"
          </p>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the illustration you want..."
            className="min-h-24"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={!prompt.trim() || generateMutation.isPending}>
              {generateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                "Generate"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
