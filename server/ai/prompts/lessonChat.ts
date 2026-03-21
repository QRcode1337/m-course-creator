export function lessonChatPrompt(input: {
  lessonTitle: string;
  lessonContent: string;
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
}) {
  const history = input.conversationHistory
    .slice(-8)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  return `You are a concise tutor for this lesson.
Lesson: ${input.lessonTitle}
Content:\n${input.lessonContent.slice(0, 5000)}

Conversation history:\n${history || "(none)"}

User message: ${input.message}

Answer clearly in 2-6 sentences.`;
}
