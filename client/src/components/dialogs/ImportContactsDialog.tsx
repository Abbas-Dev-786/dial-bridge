import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Info,
} from "lucide-react";
import { cn, getErrorMessage } from "@/lib/utils";
import { UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CSVImportResult {
  total_rows: number;
  imported: number;
  skipped_invalid: number;
  skipped_duplicate: number;
}

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Passing the mutation directly gives us access to status, data, etc.
  mutation: UseMutationResult<any, any, File, any>;
}

type Step = "upload" | "importing" | "confirm";

export function ImportContactsDialog({
  open,
  onOpenChange,
  mutation,
}: ImportContactsDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    mutation.reset();
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleImport = () => {
    if (!file) return;
    setStep("importing");
    mutation.mutate(file, {
      onSuccess: () => {
        setStep("confirm");
        toast({
          title: "Import Complete",
          description: "Your contacts have been processed successfully.",
        });
      },
      onError: (err) => {
        setStep("upload");
        toast({
          title: "Import Failed",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      },
    });
  };

  const results = mutation.data?.data as CSVImportResult | undefined;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Contacts (CSV)</DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload a CSV file with contact details for your campaign."}
            {step === "importing" &&
              "We are processing your contacts. This might take a few seconds..."}
            {step === "confirm" && "Import complete. Review the results below."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/30"
              onClick={() => document.getElementById("csv-upload")?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">
                {file ? file.name : "Click to upload CSV"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 50,000 rows · 10MB
              </p>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="rounded-lg border bg-blue-50/50 p-3 flex gap-3">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Expected Format</p>
                <p>
                  Ensure your CSV has headers. Recommended columns:{" "}
                  <code className="bg-blue-100 px-1 rounded">full_name</code>,{" "}
                  <code className="bg-blue-100 px-1 rounded">phone</code>,{" "}
                  <code className="bg-blue-100 px-1 rounded">email</code>,{" "}
                  <code className="bg-blue-100 px-1 rounded">company</code>.
                </p>
                <p className="italic">
                  * Only Full Name and Phone are strictly required.
                </p>
              </div>
            </div>

            {file && (
              <div className="flex items-center gap-2 rounded-lg border p-3 bg-white">
                <FileText className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  CSV
                </Badge>
              </div>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-6 py-10 text-center">
            <div className="relative mx-auto w-16 h-16">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary/50" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Uploading & Parsing...</p>
              <p className="text-sm text-muted-foreground">
                Extracting phone numbers and contact details.
              </p>
            </div>
          </div>
        )}

        {step === "confirm" && results && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-success">
                    Import Successful
                  </p>
                  <p className="text-xl font-bold">
                    {results.imported} Contacts Added
                  </p>
                </div>
              </div>
            </div>

            {/* <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Rows</p>
                <p className="text-lg font-bold">{results.total_rows}</p>
              </div>
              <div className={cn("rounded-xl border p-3", results.skipped_invalid > 0 ? "bg-warning/5 border-warning/20" : "bg-muted/30")}>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Invalid/Failed</p>
                <p className={cn("text-lg font-bold", results.skipped_invalid > 0 && "text-warning")}>{results.skipped_invalid}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold font-semibold">Skipped Duplicates</p>
                <p className="text-lg font-bold">{results.skipped_duplicate}</p>
              </div>
            </div> */}
          </div>
        )}

        <DialogFooter className="mt-2">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Importing...
                  </>
                ) : (
                  "Start Import"
                )}
              </Button>
            </>
          )}
          {step === "confirm" && (
            <Button className="w-full" onClick={() => handleClose(false)}>
              Return to Campaigns
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
