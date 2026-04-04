import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Upload, FileSpreadsheet, ChevronRight, ChevronLeft, Check,
  AlertTriangle, X, CheckCircle, XCircle, ArrowRight,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

interface ParsedCSV {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface FieldMapping {
  name: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
}

interface ValidationResult {
  valid: ParsedRow[];
  invalid: { row: number; data: Record<string, string>; errors: string[] }[];
}

interface ParsedRow {
  name: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
}

const REQUIRED_FIELDS = ["name", "phone"] as const;
const ALL_FIELDS: { key: keyof FieldMapping; label: string; required: boolean }[] = [
  { key: "name", label: "Full Name", required: true },
  { key: "phone", label: "Phone Number", required: true },
  { key: "email", label: "Email Address", required: false },
  { key: "company", label: "Company", required: false },
  { key: "notes", label: "Notes", required: false },
];

const steps = ["Upload", "Map Fields", "Validate", "Confirm"] as const;

/* ── CSV Parser ────────────────────────────────────────── */

function parseCSV(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows, totalRows: rows.length };
}

/* ── Auto-map heuristic ────────────────────────────────── */

function autoMap(headers: string[]): FieldMapping {
  const mapping: FieldMapping = { name: "", phone: "", email: "", company: "", notes: "" };
  const lower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const patterns: Record<keyof FieldMapping, string[]> = {
    name: ["name", "fullname", "contactname", "firstname", "contact"],
    phone: ["phone", "phonenumber", "mobile", "cell", "telephone", "tel", "number"],
    email: ["email", "emailaddress", "mail", "e-mail"],
    company: ["company", "companyname", "organization", "org", "business"],
    notes: ["notes", "note", "comment", "comments", "description"],
  };

  for (const [field, terms] of Object.entries(patterns)) {
    const idx = lower.findIndex(h => terms.some(t => h.includes(t)));
    if (idx !== -1) (mapping as any)[field] = headers[idx];
  }
  return mapping;
}

/* ── Validator ─────────────────────────────────────────── */

const phoneRegex = /^[+]?[\d\s().-]{7,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRows(rows: string[][], headers: string[], mapping: FieldMapping): ValidationResult {
  const valid: ParsedRow[] = [];
  const invalid: ValidationResult["invalid"] = [];

  rows.forEach((row, i) => {
    const get = (field: keyof FieldMapping) => {
      const col = headers.indexOf(mapping[field]);
      return col >= 0 && col < row.length ? row[col].trim() : "";
    };
    const errors: string[] = [];
    const name = get("name");
    const phone = get("phone");
    const email = get("email");

    if (!name) errors.push("Name is required");
    if (!phone) errors.push("Phone is required");
    else if (!phoneRegex.test(phone)) errors.push("Invalid phone format");
    if (email && !emailRegex.test(email)) errors.push("Invalid email format");

    if (errors.length > 0) {
      invalid.push({ row: i + 2, data: { name, phone, email }, errors });
    } else {
      valid.push({ name, phone, email, company: get("company"), notes: get("notes") });
    }
  });

  return { valid, invalid };
}

/* ── Component ─────────────────────────────────────────── */

interface UploadContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (count: number) => void;
}

export function UploadContactsDialog({ open, onOpenChange, onImported }: UploadContactsDialogProps) {
  const [step, setStep] = useState(0);
  const [csv, setCsv] = useState<ParsedCSV | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<FieldMapping>({ name: "", phone: "", email: "", company: "", notes: "" });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(0);
    setCsv(null);
    setFileName("");
    setMapping({ name: "", phone: "", email: "", company: "", notes: "" });
    setValidation(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setCsv(parsed);
      setMapping(autoMap(parsed.headers));
      setStep(1);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const runValidation = () => {
    if (!csv) return;
    setValidation(validateRows(csv.rows, csv.headers, mapping));
    setStep(2);
  };

  const handleImport = () => {
    if (!validation) return;
    onImported?.(validation.valid.length);
    handleClose(false);
  };

  const mappingComplete = REQUIRED_FIELDS.every(f => mapping[f] !== "");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Contacts
          </DialogTitle>
          <DialogDescription>Upload a CSV file to add contacts to this campaign.</DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  i === step && "bg-primary text-primary-foreground",
                  i < step && "bg-primary/10 text-primary",
                  i > step && "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("h-px flex-1 mx-1", i < step ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ── Step 0: Upload ────────────────── */}
          {step === 0 && (
            <div className="space-y-4 py-2">
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30"
                )}
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Drop your CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1.5">Supports .csv files up to 20 MB</p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Expected CSV format</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 pr-4 text-muted-foreground font-medium">name</th>
                        <th className="text-left py-1.5 pr-4 text-muted-foreground font-medium">phone</th>
                        <th className="text-left py-1.5 pr-4 text-muted-foreground font-medium">email</th>
                        <th className="text-left py-1.5 text-muted-foreground font-medium">company</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr><td className="py-1 pr-4">Sarah Johnson</td><td className="pr-4">+1 555 101 0101</td><td className="pr-4">sarah@acme.com</td><td>Acme Inc</td></tr>
                      <tr><td className="py-1 pr-4">Mike Chen</td><td className="pr-4">+1 555 202 0202</td><td className="pr-4">mike@globex.com</td><td>Globex Corp</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Map Fields ─────────────── */}
          {step === 1 && csv && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium truncate">{fileName}</span>
                  <Badge variant="secondary" className="ml-auto shrink-0 text-xs">{csv.totalRows} rows</Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">Map your CSV columns to contact fields. Required fields are marked with <span className="text-destructive">*</span></p>

              <div className="space-y-3">
                {ALL_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-3">
                    <div className="w-36 shrink-0">
                      <span className="text-sm font-medium">{field.label}</span>
                      {field.required && <span className="text-destructive ml-0.5">*</span>}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Select
                      value={mapping[field.key] || "__none__"}
                      onValueChange={(v) => setMapping(prev => ({ ...prev, [field.key]: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger className={cn("flex-1", !mapping[field.key] && field.required && "border-destructive/50")}>
                        <SelectValue placeholder="Select column…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Skip —</SelectItem>
                        {csv.headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[field.key] && (
                      <CheckCircle className="h-4 w-4 text-success shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="rounded-lg border">
                <p className="text-xs font-medium text-muted-foreground px-3 py-2 border-b bg-muted/50">Preview (first 3 rows)</p>
                <ScrollArea className="max-h-[140px]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {ALL_FIELDS.filter(f => mapping[f.key]).map(f => (
                          <th key={f.key} className="text-left py-1.5 px-3 font-medium text-muted-foreground">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csv.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {ALL_FIELDS.filter(f => mapping[f.key]).map(f => {
                            const col = csv.headers.indexOf(mapping[f.key]);
                            return <td key={f.key} className="py-1.5 px-3 truncate max-w-[150px]">{col >= 0 ? row[col] : ""}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* ── Step 2: Validate ───────────────── */}
          {step === 2 && validation && (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-success/5 p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-success mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-success">{validation.valid.length}</p>
                  <p className="text-xs text-muted-foreground">Valid contacts</p>
                </div>
                <div className="rounded-lg border bg-destructive/5 p-4 text-center">
                  <XCircle className="h-6 w-6 text-destructive mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-destructive">{validation.invalid.length}</p>
                  <p className="text-xs text-muted-foreground">Invalid rows</p>
                </div>
              </div>

              {validation.invalid.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-sm font-medium">Issues found</p>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {validation.invalid.length} row{validation.invalid.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                      {validation.invalid.slice(0, 20).map((inv) => (
                        <div key={inv.row} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-muted-foreground">Row {inv.row}</span>
                            <span className="text-xs text-muted-foreground">{inv.data.name || inv.data.phone || "—"}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {inv.errors.map((err, j) => (
                              <Badge key={j} variant="destructive" className="text-xs font-normal">{err}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {validation.invalid.length > 20 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          …and {validation.invalid.length - 20} more
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {validation.valid.length > 0 && (
                <div className="rounded-lg border">
                  <p className="text-xs font-medium text-muted-foreground px-3 py-2 border-b bg-muted/50">
                    Valid contacts preview (first 5)
                  </p>
                  <ScrollArea className="max-h-[160px]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left py-1.5 px-3 font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-1.5 px-3 font-medium text-muted-foreground">Phone</th>
                          <th className="text-left py-1.5 px-3 font-medium text-muted-foreground">Email</th>
                          <th className="text-left py-1.5 px-3 font-medium text-muted-foreground">Company</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validation.valid.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 px-3 font-medium">{row.name}</td>
                            <td className="py-1.5 px-3 font-mono">{row.phone}</td>
                            <td className="py-1.5 px-3 text-muted-foreground">{row.email || "—"}</td>
                            <td className="py-1.5 px-3">{row.company || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Confirm ────────────────── */}
          {step === 3 && validation && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border bg-muted/50 p-6 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Ready to import</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-bold text-foreground">{validation.valid.length}</span> contacts will be added to this campaign.
                    {validation.invalid.length > 0 && (
                      <span className="text-warning"> {validation.invalid.length} invalid rows will be skipped.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Source File", value: fileName },
                  { label: "Total Rows", value: csv?.totalRows.toString() || "0" },
                  { label: "Valid Contacts", value: validation.valid.length.toString() },
                  { label: "Skipped Rows", value: validation.invalid.length.toString() },
                ].map(item => (
                  <div key={item.label} className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step === 0 ? 0 : step - 1)}>
              <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
            </Button>
          ) : (
            <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          )}

          {step === 1 && (
            <Button onClick={runValidation} disabled={!mappingComplete}>
              Validate <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={validation?.valid.length === 0}>
              Continue <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleImport}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Import {validation?.valid.length} Contacts
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
