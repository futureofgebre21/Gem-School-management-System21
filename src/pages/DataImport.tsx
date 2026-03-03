import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUp, Upload, CheckCircle2, AlertCircle, Download, X } from "lucide-react";
import * as XLSX from "xlsx";

type ImportTarget = "students" | "teachers";

interface ParsedRow {
  [key: string]: string;
}

const STUDENT_REQUIRED = ["first_name", "last_name"];
const TEACHER_REQUIRED = ["first_name", "last_name"];

const STUDENT_COLUMNS = ["first_name", "last_name", "gender", "class", "section", "date_of_birth", "parent_name", "parent_phone", "parent_email", "address"];
const TEACHER_COLUMNS = ["first_name", "last_name", "email", "phone"];

export default function DataImport() {
  const { schoolId, userRole } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ImportTarget>("students");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const isAllowed = userRole === "school_admin" || userRole === "teacher" || userRole === "super_admin";

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">You don't have permission to import data.</p>
      </div>
    );
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: ParsedRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (json.length === 0) {
          toast.error("The file appears to be empty");
          return;
        }

        // Normalize column names: lowercase, trim, replace spaces with underscores
        const normalized = json.map(row => {
          const newRow: ParsedRow = {};
          Object.entries(row).forEach(([key, val]) => {
            const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
            newRow[normalizedKey] = String(val).trim();
          });
          return newRow;
        });

        setColumns(Object.keys(normalized[0]));
        setParsedData(normalized);
        toast.success(`Parsed ${normalized.length} rows from ${file.name}`);
      } catch {
        toast.error("Failed to parse file. Please use a valid CSV or Excel file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const clearFile = () => {
    setParsedData([]);
    setColumns([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    if (!schoolId || parsedData.length === 0) return;
    setImporting(true);
    setResult(null);

    const required = target === "students" ? STUDENT_REQUIRED : TEACHER_REQUIRED;
    const missingCols = required.filter(c => !columns.includes(c));
    if (missingCols.length > 0) {
      toast.error(`Missing required columns: ${missingCols.join(", ")}`);
      setImporting(false);
      return;
    }

    let success = 0;
    let failed = 0;

    if (target === "students") {
      for (const row of parsedData) {
        const { error } = await supabase.from("students").insert({
          school_id: schoolId,
          first_name: row.first_name,
          last_name: row.last_name,
          gender: row.gender || null,
          class: row.class || null,
          section: row.section || null,
          date_of_birth: row.date_of_birth || null,
          parent_name: row.parent_name || null,
          parent_phone: row.parent_phone || null,
          parent_email: row.parent_email || null,
          address: row.address || null,
          student_id_number: "", // trigger will generate
        });
        if (error) failed++;
        else success++;
      }
    } else {
      for (const row of parsedData) {
        const { error } = await supabase.from("teachers").insert({
          school_id: schoolId,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email || null,
          phone: row.phone || null,
        });
        if (error) failed++;
        else success++;
      }
    }

    setResult({ success, failed });
    setImporting(false);
    if (success > 0) toast.success(`Successfully imported ${success} ${target}`);
    if (failed > 0) toast.error(`${failed} rows failed to import`);
  };

  const downloadTemplate = () => {
    const cols = target === "students" ? STUDENT_COLUMNS : TEACHER_COLUMNS;
    const ws = XLSX.utils.aoa_to_sheet([cols]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${target}_import_template.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Data</h1>
        <p className="text-muted-foreground text-sm">Upload CSV or Excel files to bulk import students and teachers</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="shadow-card md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileUp className="w-5 h-5" /> Import Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Import To</label>
              <Select value={target} onValueChange={(v) => { setTarget(v as ImportTarget); clearFile(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="students">👨‍🎓 Students</SelectItem>
                  <SelectItem value="teachers">👨‍🏫 Teachers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full gap-2">
              <Download className="w-4 h-4" /> Download Template
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Upload File</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFile}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {fileName || "Click to upload CSV or Excel"}
                  </p>
                </label>
              </div>
              {fileName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium truncate">{fileName}</span>
                  <Button variant="ghost" size="icon" onClick={clearFile} className="h-6 w-6">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {parsedData.length > 0 && (
              <Button onClick={handleImport} disabled={importing} className="w-full gap-2">
                {importing ? "Importing..." : `Import ${parsedData.length} ${target}`}
              </Button>
            )}

            {result && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-foreground">{result.success} imported successfully</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-foreground">{result.failed} failed</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="shadow-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Data Preview</CardTitle>
            <CardDescription>
              {parsedData.length > 0
                ? `${parsedData.length} rows detected with ${columns.length} columns`
                : "Upload a file to preview the data before importing"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {parsedData.length > 0 ? (
              <div className="overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {columns.map(col => (
                        <TableHead key={col} className="capitalize whitespace-nowrap">
                          {col.replace(/_/g, " ")}
                          {(target === "students" ? STUDENT_REQUIRED : TEACHER_REQUIRED).includes(col) && (
                            <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">req</Badge>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        {columns.map(col => (
                          <TableCell key={col} className="text-sm whitespace-nowrap">
                            {row[col] || <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Showing first 50 of {parsedData.length} rows
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileUp className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No data to preview</p>
                <p className="text-xs mt-1">Upload a CSV or Excel file to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
