import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { RotateCcw } from "lucide-react";

interface Props {
  term: string;
  definition: string;
  onRate: (rating: "again" | "hard" | "good" | "easy") => void;
  intervalPreviews?: Record<string, string>;
  showRating?: boolean;
}

export function Flashcard({ term, definition, onRate, showRating = true }: Props) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => setFlipped(!flipped);

  const handleRate = (rating: "again" | "hard" | "good" | "easy") => {
    onRate(rating);
    setFlipped(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Card */}
      <div className="perspective-1000 cursor-pointer" onClick={handleFlip}>
        <div
          className={`relative w-full h-80 transition-transform duration-500 preserve-3d ${flipped ? "rotate-y-180" : ""}`}
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front (Term) */}
          <Card
            className={`absolute inset-0 backface-hidden flex items-center justify-center p-8 border-2 border-current bg-background ${flipped ? "" : "z-10"}`}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Term</p>
              <h2 className="text-3xl font-bold">{term}</h2>
              <p className="text-sm text-muted-foreground mt-8">Click to reveal definition</p>
            </div>
          </Card>

          {/* Back (Definition) */}
          <Card
            className={`absolute inset-0 backface-hidden flex items-center justify-center p-8 border-2 border-current bg-accent ${flipped ? "z-10" : ""}`}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Definition</p>
              <div className="text-lg leading-relaxed max-h-60 overflow-y-auto">{definition}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Flip Button */}
      {!flipped && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={handleFlip} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-2" />
            Flip Card
          </Button>
        </div>
      )}

      {/* Rating Buttons */}
      {flipped && showRating && (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">How well did you know this?</p>
          <div className="grid grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => handleRate("again")}
              className="flex flex-col h-auto py-4 border-2 hover:border-red-500 hover:bg-red-50"
            >
              <span className="font-bold">Again</span>
              <span className="text-xs text-muted-foreground">Didn't know</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRate("hard")}
              className="flex flex-col h-auto py-4 border-2 hover:border-orange-500 hover:bg-orange-50"
            >
              <span className="font-bold">Hard</span>
              <span className="text-xs text-muted-foreground">Barely</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRate("good")}
              className="flex flex-col h-auto py-4 border-2 hover:border-green-500 hover:bg-green-50"
            >
              <span className="font-bold">Good</span>
              <span className="text-xs text-muted-foreground">Knew it</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRate("easy")}
              className="flex flex-col h-auto py-4 border-2 hover:border-blue-500 hover:bg-blue-50"
            >
              <span className="font-bold">Easy</span>
              <span className="text-xs text-muted-foreground">Too easy</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
