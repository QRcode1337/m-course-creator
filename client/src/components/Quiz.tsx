import { useState } from "react";
import { trpc } from "../utils/trpc";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface Props {
  lessonId: string;
}

export function Quiz({ lessonId }: Props) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);

  const { data, isLoading } = trpc.quizzes.getByLessonId.useQuery({ lessonId }, { enabled: started });
  const generateMutation = trpc.quizzes.generate.useMutation();
  const submitMutation = trpc.quizzes.submit.useMutation();

  const handleStart = async () => {
    try {
      await generateMutation.mutateAsync({ lessonId });
      setStarted(true);
    } catch (error) {
      console.error("Failed to generate quiz:", error);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!data?.quiz) return;
    try {
      const result = await submitMutation.mutateAsync({ quizId: data.quiz.id, answers });
      setResults(result);
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResults(null);
  };

  if (!started) {
    return (
      <Card className="border-2 border-current p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h3 className="text-xl font-bold">Test Your Knowledge</h3>
          <p className="text-muted-foreground text-center">
            Take a quiz to test what you've learned in this lesson
          </p>
          <Button onClick={handleStart}>Start Quiz</Button>
        </div>
      </Card>
    );
  }

  if (isLoading || generateMutation.isPending) {
    return (
      <Card className="border-2 border-current p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-muted-foreground">Generating quiz questions...</p>
        </div>
      </Card>
    );
  }

  if (!data?.quiz || !data?.questions) {
    return (
      <Card className="border-2 border-current p-8 text-center">
        <p className="text-muted-foreground">Failed to load quiz. Please try again.</p>
        <Button onClick={() => setStarted(false)} className="mt-4">Go Back</Button>
      </Card>
    );
  }

  // Results View
  if (submitted && results) {
    return (
      <Card className="border-2 border-current p-8">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-primary mx-auto flex items-center justify-center rounded-full">
              <span className="text-4xl font-bold text-primary-foreground">{results.score}%</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Quiz Complete!</h3>
              <p className="text-muted-foreground">
                {results.score >= 80 ? "Great job!" : results.score >= 60 ? "Good effort!" : "Keep studying!"}
              </p>
            </div>
          </div>

          {/* Question Review */}
          <div className="space-y-6">
            {data.questions.map((question: any, idx: number) => {
              const qId = question.id.toString();
              const result = results.results[qId];
              const isCorrect = result?.correct;
              return (
                <div key={qId} className="space-y-3">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1 space-y-2">
                      <p className="font-bold">Question {idx + 1}: {question.questionText}</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-bold">Your answer:</span> {result?.userAnswer}</p>
                        {!isCorrect && (
                          <p className="text-green-600">
                            <span className="font-bold">Correct answer:</span> {result?.correctAnswer}
                          </p>
                        )}
                        <p className="text-muted-foreground">{result?.explanation}</p>
                      </div>
                    </div>
                  </div>
                  {idx < data.questions.length - 1 && <hr className="border-current" />}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleRetry}>Try Again</Button>
          </div>
        </div>
      </Card>
    );
  }

  // Quiz Questions View
  return (
    <Card className="border-2 border-current p-8">
      <div className="space-y-8">
        <h3 className="text-2xl font-bold">Quiz</h3>
        {data.questions.map((question: any, idx: number) => (
          <div key={question.id} className="space-y-4">
            <p className="font-bold">
              {idx + 1}. {question.questionText}
            </p>
            <RadioGroup
              value={answers[question.id.toString()] || ""}
              onValueChange={(value) => handleAnswer(question.id.toString(), value)}
            >
              {question.options.map((option: string, optIdx: number) => (
                <div key={optIdx} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`q${question.id}-opt${optIdx}`} />
                  <Label htmlFor={`q${question.id}-opt${optIdx}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
        <Button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < data.questions.length || submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
          ) : (
            "Submit Answers"
          )}
        </Button>
      </div>
    </Card>
  );
}
