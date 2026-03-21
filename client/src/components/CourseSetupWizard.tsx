import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { X } from "lucide-react";

const APPROACH_OPTIONS = [
  {
    id: "balanced",
    title: "Balanced approach",
    description: "Comprehensive coverage balancing theory, practice, and accessibility",
  },
  {
    id: "rigorous",
    title: "Rigorous academic and logic",
    description: "Deep theoretical foundations with formal reasoning and scholarly rigor",
  },
  {
    id: "accessible",
    title: "Easily explained and understood",
    description: "Clear explanations suitable for high school level literacy",
  },
];

const FAMILIARITY_OPTIONS = [
  { value: "new", label: "New to this", level: 1 },
  { value: "moderate", label: "Moderate", level: 2 },
  { value: "expert", label: "Know it well", level: 3 },
];

interface CourseSetupConfig {
  approach?: string;
  familiarityLevel?: string;
  assessmentAnswers?: Array<{ question: string; answer: string }>;
}

interface Props {
  topic: string;
  onComplete: (config: CourseSetupConfig) => void;
  onCancel: () => void;
}

export function CourseSetupWizard({ topic, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<"approach" | "familiarity" | "requirements">("approach");
  const [approach, setApproach] = useState("");
  const [familiarity, setFamiliarity] = useState("");
  const [requirements, setRequirements] = useState("");

  const handleNext = () => {
    if (step === "approach") setStep("familiarity");
    else if (step === "familiarity") setStep("requirements");
  };

  const handleBack = () => {
    if (step === "familiarity") setStep("approach");
    else if (step === "requirements") setStep("familiarity");
  };

  const handleComplete = () => {
    const answers: Array<{ question: string; answer: string }> = [];
    if (familiarity) answers.push({ question: "How familiar are you with this topic?", answer: familiarity });
    if (requirements) answers.push({ question: "Additional requirements", answer: requirements });
    onComplete({
      approach: approach || undefined,
      familiarityLevel: familiarity || undefined,
      assessmentAnswers: answers.length > 0 ? answers : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl bg-background border-2 border-current p-8 max-h-[90vh] overflow-y-auto">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">{topic}</h2>
              <p className="text-muted-foreground">Choose how you'd like to approach this topic</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Step 1: Approach */}
          {step === "approach" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4">Course content</h3>
                <div className="space-y-3">
                  {APPROACH_OPTIONS.map((option) => (
                    <Card
                      key={option.id}
                      className={`p-6 cursor-pointer border-2 transition-colors ${
                        approach === option.id ? "border-primary bg-accent" : "border-current hover:border-primary"
                      }`}
                      onClick={() => setApproach(option.id)}
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg">{option.title}</h4>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t-2 border-current">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleNext} disabled={!approach}>Next &rarr;</Button>
              </div>
            </div>
          )}

          {/* Step 2: Familiarity */}
          {step === "familiarity" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4">How familiar are you with this topic?</h3>
                <div className="grid grid-cols-3 gap-4">
                  {FAMILIARITY_OPTIONS.map((option) => (
                    <Card
                      key={option.value}
                      className={`p-6 cursor-pointer border-2 transition-colors text-center ${
                        familiarity === option.value ? "border-primary bg-accent" : "border-current hover:border-primary"
                      }`}
                      onClick={() => setFamiliarity(option.value)}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-center gap-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-${4 + i * 2} ${i < option.level ? "bg-foreground" : "bg-muted"}`}
                            />
                          ))}
                        </div>
                        <p className="font-bold">{option.label}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="flex justify-between gap-4 pt-4 border-t-2 border-current">
                <Button variant="outline" onClick={handleBack}>&larr; Back</Button>
                <Button onClick={handleNext} disabled={!familiarity}>Next &rarr;</Button>
              </div>
            </div>
          )}

          {/* Step 3: Requirements */}
          {step === "requirements" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-2">Additional requirements (optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  e.g., "Less math-heavy", "Include distributed systems aspects"
                </p>
                <Textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Enter any specific requirements or preferences..."
                  className="min-h-32 border-2 border-current"
                />
              </div>
              <div className="flex justify-between gap-4 pt-4 border-t-2 border-current">
                <Button variant="outline" onClick={handleBack}>&larr; Back</Button>
                <Button onClick={handleComplete}>Create Course</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
