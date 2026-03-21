import { useLocation } from "wouter";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface Props {
  topics: Array<{ title: string; description?: string }>;
}

export function RelatedTopics({ topics }: Props) {
  const [, navigate] = useLocation();

  if (!topics || topics.length === 0) return null;

  return (
    <Card className="border-2 border-current p-6 space-y-4">
      <h3 className="font-bold text-lg">Related Topics</h3>
      <div className="space-y-3">
        {topics.map((topic, i) => (
          <div key={i} className="space-y-1">
            <Button
              variant="link"
              className="p-0 h-auto font-medium"
              onClick={() => navigate(`/?topic=${encodeURIComponent(topic.title)}`)}
            >
              {topic.title}
            </Button>
            {topic.description && (
              <p className="text-xs text-muted-foreground">{topic.description}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
