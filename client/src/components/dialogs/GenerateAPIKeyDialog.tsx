import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Key } from "lucide-react";

interface GenerateAPIKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateAPIKeyDialog({ open, onOpenChange }: GenerateAPIKeyDialogProps) {
  const [step, setStep] = useState<"create" | "show">("create");
  const [copied, setCopied] = useState(false);
  const generatedKey = "vai_prod_sk_" + Math.random().toString(36).slice(2, 18);

  const handleCreate = () => setStep("show");
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep("create");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {step === "create" ? "Generate API Key" : "API Key Created"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "create"
              ? "Create a new API key for programmatic access."
              : "Copy your key now — you won't be able to see it again."}
          </DialogDescription>
        </DialogHeader>

        {step === "create" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input placeholder="e.g., Production, Staging" />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select defaultValue="production">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <code className="flex-1 font-mono text-xs break-all">{generatedKey}</code>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs text-warning font-medium">⚠️ This key will only be shown once. Store it securely.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "create" ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreate}>Generate Key</Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
