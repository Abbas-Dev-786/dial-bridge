import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { workspaceRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ImportElevenLabsNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (count: number) => void;
}

interface AvailableNumber {
  elevenlabs_number_id: string;
  number: string;
  label: string | null;
  is_imported: boolean;
  is_unavailable: boolean;
}

export function ImportElevenLabsNumberDialog({ open, onOpenChange, onImported }: ImportElevenLabsNumberDialogProps) {
  const { toast } = useToast();
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableNumbers();
    } else {
      setSelected(new Set());
    }
  }, [open]);

  const fetchAvailableNumbers = async () => {
    setIsLoading(true);
    try {
      const res = await workspaceRequest.get<AvailableNumber[]>("/phone-numbers/elevenlabs-available");
      setAvailableNumbers(res.data);
    } catch (error) {
      console.error("Failed to fetch available numbers", error);
      toast({
        title: "Error",
        description: "Failed to load available numbers from ElevenLabs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    let successCount = 0;
    const selectedArray = Array.from(selected);

    try {
      for (const id of selectedArray) {
        const numberToImport = availableNumbers.find(n => n.elevenlabs_number_id === id);
        await workspaceRequest.post("/phone-numbers/import-elevenlabs", {
          elevenlabs_number_id: id,
          friendly_name: numberToImport?.label || ""
        });
        successCount++;
      }
      
      onImported?.(successCount);
      onOpenChange(false);
    } catch (error) {
      console.error("Import failed", error);
      toast({
        title: "Import partially failed",
        description: `Imported ${successCount} out of ${selectedArray.length} numbers.`,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from ElevenLabs</DialogTitle>
          <DialogDescription>Select phone numbers from your ElevenLabs account to import into this workspace.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking ElevenLabs account...</p>
          </div>
        ) : availableNumbers.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {availableNumbers.map((num) => {
              const isDisabled = num.is_imported || num.is_unavailable;
              return (
                <div
                  key={num.elevenlabs_number_id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${isDisabled ? "bg-muted/50 opacity-60 cursor-not-allowed" : "hover:bg-accent/50 cursor-pointer"}`}
                  onClick={() => !isDisabled && toggle(num.elevenlabs_number_id)}
                >
                  <Checkbox 
                    checked={selected.has(num.elevenlabs_number_id) || num.is_imported} 
                    disabled={isDisabled} 
                  />
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium">{num.number}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{num.label || "No Label"}</p>
                  </div>
                  {num.is_imported && (
                    <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-success/10 text-success border-0">
                      <CheckCircle className="h-3 w-3" /> Imported
                    </Badge>
                  )}
                  {num.is_unavailable && !num.is_imported && (
                    <Badge variant="outline" className="text-[10px] h-5 gap-1 text-orange-500 border-orange-200 bg-orange-50">
                      <AlertCircle className="h-3 w-3" /> Occupied
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center border rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">No available numbers found in ElevenLabs.</p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
          <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
            {importing ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Importing...</> : `Import ${selected.size} Number${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
