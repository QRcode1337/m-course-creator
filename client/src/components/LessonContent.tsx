import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GlossaryTerm } from "./GlossaryTerm";

interface Props {
  content?: string;
  children?: string;
  glossaryTerms?: Array<{ term: string; definition: string }>;
}

export function LessonContent({ content, children, glossaryTerms }: Props) {
  const text = content || children || "";
  const termMap = new Map((glossaryTerms || []).map((t) => [t.term.toLowerCase(), t.definition]));

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: ({ children }) => {
            const text = String(children);
            const definition = termMap.get(text.toLowerCase());
            if (definition) {
              return <GlossaryTerm term={text} definition={definition} />;
            }
            return <strong>{children}</strong>;
          },
          h1: ({ children }) => <h1 className="text-4xl font-bold mb-4 mt-8">{children}</h1>,
          h2: ({ children }) => <h2 className="text-3xl font-bold mb-3 mt-6">{children}</h2>,
          h3: ({ children }) => <h3 className="text-2xl font-bold mb-2 mt-4">{children}</h3>,
          p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-6 mb-4">{children}</ol>,
          li: ({ children }) => <li className="mb-2">{children}</li>,
          code: ({ className, children }) =>
            className ? (
              <code className={`${className} block bg-muted p-4 rounded-lg overflow-x-auto`}>{children}</code>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
            ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-4">{children}</blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
