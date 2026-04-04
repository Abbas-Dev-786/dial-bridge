import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentDialog({ open, onOpenChange }: UploadDocumentDialogProps) {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [files, setFiles] = useState<string[]>([]);
  const [url, setUrl] = useState("");

  const handleDrop = () => {
    setFiles(["Product_FAQ.pdf", "Pricing_Guide.docx"]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Knowledge</DialogTitle>
          <DialogDescription>Upload documents or scrape a URL for your agents to reference.</DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex rounded-lg border p-1 gap-1">
          <button
            onClick={() => setMode("file")}
            className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="h-3.5 w-3.5" /> Upload File
          </button>
          <button
            onClick={() => setMode("url")}
            className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe className="h-3.5 w-3.5" /> Web URL
          </button>
        </div>

        {mode === "file" ? (
          <div className="space-y-3">
            <div
              onClick={handleDrop}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT up to 25 MB</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm flex-1 truncate">{f}</span>
                    <button onClick={() => setFiles(files.filter(x => x !== f))} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input placeholder="https://docs.example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">We'll crawl and index the page content for your knowledge base.</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)} disabled={mode === "file" ? files.length === 0 : !url}>
            {mode === "file" ? "Upload" : "Scrape & Index"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
