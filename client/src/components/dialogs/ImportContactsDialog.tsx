import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (count: number) => void;
}

type Step = "upload" | "map" | "validate" | "confirm";

const CSV_FIELDS = ["full_name", "phone", "email", "company", "notes"];

export function ImportContactsDialog({ open, onOpenChange, onImported }: ImportContactsDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({
    "Name": "full_name", "Phone Number": "phone", "Email Address": "email", "Company": "company",
  });

  // Mock CSV headers
  const csvHeaders = ["Name", "Phone Number", "Email Address", "Company", "Notes", "Extra"];

  const mockResults = { total: 1247, imported: 1189, skipped_invalid: 38, skipped_duplicate: 20, errors: [] as string[] };

  const reset = () => {
    setStep("upload");
    setFile(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Contacts (CSV)</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file with up to 50,000 rows (max 10MB)."}
            {step === "map" && "Map your CSV columns to contact fields."}
            {step === "validate" && "Validating your data..."}
            {step === "confirm" && "Import complete. Review the results below."}
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-2">
          {(["upload", "map", "validate", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium",
                step === s ? "bg-primary text-primary-foreground" :
                (["upload", "map", "validate", "confirm"].indexOf(step) > i ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")
              )}>{i + 1}</div>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("csv-upload")?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">{file ? file.name : "Click to upload CSV"}</p>
              <p className="text-xs text-muted-foreground mt-1">Max 50,000 rows · 10MB</p>
              <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            {file && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <FileText className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Badge variant="secondary" className="text-xs">CSV</Badge>
              </div>
            )}
          </div>
        )}

        {step === "map" && (
          <div className="space-y-3">
            {csvHeaders.map((header) => (
              <div key={header} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate font-mono">{header}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Select value={mapping[header] || "skip"} onValueChange={(v) => setMapping(p => ({ ...p, [header]: v }))}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">— Skip —</SelectItem>
                    {CSV_FIELDS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {step === "validate" && (
          <div className="space-y-4 py-4 text-center">
            <Progress value={100} className="h-2" />
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <p className="text-sm font-medium">Validation complete</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-lg font-bold">{mockResults.total}</p>
                <p className="text-xs text-muted-foreground">Total rows</p>
              </div>
              <div className="rounded-lg bg-success/10 p-3">
                <p className="text-lg font-bold text-success">{mockResults.imported}</p>
                <p className="text-xs text-muted-foreground">Valid</p>
              </div>
              <div className="rounded-lg bg-warning/10 p-3">
                <p className="text-lg font-bold text-warning">{mockResults.skipped_invalid}</p>
                <p className="text-xs text-muted-foreground">Invalid (skipped)</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-lg font-bold">{mockResults.skipped_duplicate}</p>
                <p className="text-xs text-muted-foreground">Duplicates (skipped)</p>
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="py-4 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-success mx-auto" />
            <p className="text-lg font-semibold">{mockResults.imported} contacts imported</p>
            <p className="text-sm text-muted-foreground">
              {mockResults.skipped_invalid + mockResults.skipped_duplicate} skipped ({mockResults.skipped_invalid} invalid, {mockResults.skipped_duplicate} duplicates)
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button onClick={() => setStep("map")} disabled={!file}>Next: Map Columns</Button>
          )}
          {step === "map" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={() => setStep("validate")}>Validate</Button>
            </>
          )}
          {step === "validate" && (
            <>
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={() => setStep("confirm")}>Import {mockResults.imported} Contacts</Button>
            </>
          )}
          {step === "confirm" && (
            <Button onClick={() => { onImported?.(mockResults.imported); handleClose(false); }}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
