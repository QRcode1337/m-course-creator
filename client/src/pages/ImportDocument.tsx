import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  File,
  FileText,
  FileType,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { trpc } from "../utils/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

type UploadDocument = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  wordCount: number | null;
  title: string | null;
  errorMessage: string | null;
  courseId: string | null;
  createdAt: number;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf":
      return <FileText className="h-5 w-5 text-red-500" />;
    case "docx":
      return <FileType className="h-5 w-5 text-blue-500" />;
    case "txt":
    case "md":
      return <File className="h-5 w-5 text-slate-500" />;
    default:
      return <File className="h-5 w-5" />;
  }
}

export default function ImportDocument() {
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [approach, setApproach] = useState<"balanced" | "rigorous" | "easy">("balanced");
  const [courseLength, setCourseLength] = useState<"short" | "medium" | "comprehensive">("medium");
  const [lessonsPerChapter, setLessonsPerChapter] = useState<"few" | "moderate" | "many">("moderate");
  const [contentDepth, setContentDepth] = useState<"introductory" | "intermediate" | "advanced">("intermediate");

  const utils = trpc.useUtils();
  const { data: documents = [] } = trpc.documents.list.useQuery();

  const deleteDocument = trpc.documents.delete.useMutation({
    onSuccess: async () => {
      await utils.documents.list.invalidate();
      toast.success("Document deleted.");
    },
    onError: (error) => toast.error(error.message),
  });

  const generateCourse = trpc.documents.generateCourse.useMutation({
    onSuccess: (data) => {
      toast.success("Course created from imported documents.");
      navigate(`/course/${data.courseId}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const readyDocuments = useMemo(
    () => documents.filter((doc) => doc.status === "ready"),
    [documents],
  );

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setIsUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || `Failed to upload ${file.name}`);
        }
      }

      await utils.documents.list.invalidate();
      toast.success("Documents uploaded and processed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleUpload(event.dataTransfer.files);
  }, []);

  const toggleSelection = (documentId: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId],
    );
  };

  const handleGenerate = () => {
    if (selectedDocuments.length === 0) {
      toast.error("Select at least one processed document.");
      return;
    }

    generateCourse.mutate({
      documentIds: selectedDocuments,
      approach,
      courseLength,
      lessonsPerChapter,
      contentDepth,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8 space-y-8">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Document Import</span>
          </div>
          <h1 className="text-3xl font-bold">Create a Course from Your Source Material</h1>
          <p className="text-muted-foreground">
            Upload PDFs, DOCX, TXT, or Markdown files. The app extracts the text and turns it into a structured course.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Upload one or more files, then choose which processed documents to use for course generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Drag and drop files here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Supports `.pdf`, `.docx`, `.txt`, and `.md`
              </p>
              <Button
                className="mt-4"
                variant="outline"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Choose Files"
                )}
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.docx,.txt,.md,.markdown"
                onChange={(event) => void handleUpload(event.target.files)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Processed Documents</CardTitle>
              <CardDescription>Select ready documents to combine into a course.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.length === 0 && (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              )}
              {documents.map((document) => {
                const selected = selectedDocuments.includes(document.id);
                return (
                  <div key={document.id} className="rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected}
                        disabled={document.status !== "ready"}
                        onCheckedChange={() => toggleSelection(document.id)}
                      />
                      <div className="pt-0.5">{getFileIcon(document.fileType)}</div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{document.fileName}</p>
                          {document.status === "ready" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                          {document.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(document.fileSize)}
                          {document.wordCount ? ` • ${document.wordCount.toLocaleString()} words` : ""}
                          {document.title ? ` • ${document.title}` : ""}
                        </p>
                        {document.errorMessage && (
                          <p className="text-xs text-destructive">{document.errorMessage}</p>
                        )}
                        {document.courseId && (
                          <p className="text-xs text-muted-foreground">Already linked to course {document.courseId}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDocument.mutate({ documentId: document.id })}
                        disabled={deleteDocument.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
              <CardDescription>Control how the imported material is transformed into a course.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Approach</Label>
                <Select value={approach} onValueChange={(value) => setApproach(value as typeof approach)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="rigorous">Rigorous Academic</SelectItem>
                    <SelectItem value="easy">Easily Explained</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Course Length</Label>
                <Select value={courseLength} onValueChange={(value) => setCourseLength(value as typeof courseLength)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lessons per Chapter</Label>
                <Select value={lessonsPerChapter} onValueChange={(value) => setLessonsPerChapter(value as typeof lessonsPerChapter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="few">Few</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="many">Many</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Content Depth</Label>
                <Select value={contentDepth} onValueChange={(value) => setContentDepth(value as typeof contentDepth)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="introductory">Introductory</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleGenerate} disabled={generateCourse.isPending || readyDocuments.length === 0}>
                {generateCourse.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Course...
                  </>
                ) : (
                  "Generate Course from Documents"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
