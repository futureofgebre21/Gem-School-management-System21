import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X } from "lucide-react";
import { parseExcelOrCSV } from "./parseUpload";
import type { ParsedQuestion } from "./types";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subjects: any[] | undefined;
  onImport: (rows: ParsedQuestion[]) => Promise<void>;
  isPending: boolean;
}

export default function BulkUploadDialog({ open, onOpenChange, subjects, onImport, isPending }: Props) {
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast({ title: "Unsupported file", description: "Please upload .xlsx, .xls, or .csv files", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseExcelOrCSV(buffer, file.name);
      if (!rows.length) {
        toast({ title: "No data found", description: "The file appears to be empty", variant: "destructive" });
        return;
      }
      // Auto-match subject names to IDs
      rows.forEach(r => {
        if (r.subject_name && subjects?.length) {
          const match = subjects.find(s => s.name.toLowerCase() === r.subject_name.toLowerCase());
          if (match) r.subject_id = match.id;
          else r.errors.push(`Subject "${r.subject_name}" not found`);
        } else if (!r.subject_id) {
          r.errors.push("Missing subject");
        }
      });
      setParsed(rows);
      toast({ title: `${rows.length} questions parsed from file` });
    } catch (e: any) {
      toast({ title: "Parse error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [subjects]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const validCount = parsed.filter(r => r.errors.length === 0).length;
  const errorCount = parsed.filter(r => r.errors.length > 0).length;

  const handleImport = async () => {
    await onImport(parsed);
    setParsed([]);
    onOpenChange(false);
  };

  const removeRow = (idx: number) => setParsed(p => p.filter((_, i) => i !== idx));

  const updateSubject = (idx: number, subjectId: string) => {
    setParsed(p => p.map((q, i) => {
      if (i !== idx) return q;
      const updated = { ...q, subject_id: subjectId, errors: q.errors.filter(e => !e.includes("Subject")) };
      return updated;
    }));
  };

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setParsed([]); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Bulk Upload Questions
          </DialogTitle>
        </DialogHeader>

        {!parsed.length ? (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-semibold">File Format Instructions</p>
              <p>Upload an Excel (.xlsx) or CSV file with these columns:</p>
              <code className="block bg-muted p-2 rounded text-xs">
                Subject, Grade Level, Question Text, Option A, Option B, Option C, Option D, Correct Answer, Explanation, Difficulty
              </code>
              <p className="text-muted-foreground">Correct Answer must be A, B, C, or D. Difficulty: easy, medium, or hard.</p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium text-foreground">Drag & drop your file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">Supports .xlsx, .xls, .csv</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />

            {uploading && <Progress value={50} className="animate-pulse" />}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" /> {validCount} valid
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errorCount} with errors
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">{parsed.length} total questions</span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => setParsed([])}>Re-upload</Button>
                <Button onClick={handleImport} disabled={isPending || validCount === 0}>
                  Import {validCount} Questions
                </Button>
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Answer</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((q, i) => (
                    <TableRow key={i} className={q.errors.length ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{q.question_text}</TableCell>
                      <TableCell>
                        {q.subject_id ? (
                          <span className="text-sm">{q.subject_name}</span>
                        ) : (
                          <Select onValueChange={v => updateSubject(i, v)}>
                            <SelectTrigger className="h-7 text-xs w-28">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{q.grade_level}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{q.correct_answer}</Badge></TableCell>
                      <TableCell className="text-sm capitalize">{q.difficulty_level}</TableCell>
                      <TableCell>
                        {q.errors.length ? (
                          <span className="text-xs text-destructive" title={q.errors.join(", ")}>
                            <AlertTriangle className="w-3 h-3 inline mr-1" />{q.errors[0]}
                          </span>
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(i)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
