import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Loader2, CheckCircle } from "lucide-react";

interface ImportElevenLabsNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (count: number) => void;
}

const availableNumbers = [
  { id: "el-1", number: "+1 (555) 700-8001", label: "US West", is_imported: false },
  { id: "el-2", number: "+1 (555) 700-8002", label: "US East", is_imported: false },
  { id: "el-3", number: "+44 20 7123 4567", label: "UK London", is_imported: false },
  { id: "el-4", number: "+1 (555) 100-2000", label: "Primary Outbound", is_imported: true },
];

export function ImportElevenLabsNumberDialog({ open, onOpenChange, onImported }: ImportElevenLabsNumberDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      onImported?.(selected.size);
      setSelected(new Set());
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from ElevenLabs</DialogTitle>
          <DialogDescription>Select phone numbers from your ElevenLabs account to import.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {availableNumbers.map((num) => (
            <div
              key={num.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${num.is_imported ? "opacity-50" : "hover:bg-accent/50 cursor-pointer"}`}
              onClick={() => !num.is_imported && toggle(num.id)}
            >
              <Checkbox checked={selected.has(num.id) || num.is_imported} disabled={num.is_imported} />
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium">{num.number}</p>
                <p className="text-xs text-muted-foreground">{num.label}</p>
              </div>
              {num.is_imported && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCircle className="h-3 w-3" /> Imported
                </Badge>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
            {importing ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Importing...</> : `Import ${selected.size} Number${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
