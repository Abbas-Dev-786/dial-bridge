import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import { useCampaignMutations } from "@/hooks/api/useCampaigns";
import { useToast } from "@/hooks/use-toast";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  title?: string;
  description?: string;
}

export function ExportDataDialog({ 
  open, 
  onOpenChange, 
  campaignId,
  title = "Export Data", 
  description = "Choose format and fields to include." 
}: ExportDataDialogProps) {
  const { toast } = useToast();
  const { exportContacts } = useCampaignMutations(campaignId);

  const handleExport = () => {
    if (!campaignId) return;

    exportContacts.mutate(undefined, {
      onSuccess: (data: any) => {
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `campaign_${campaignId}_export.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: "Export successful", description: "Your file is ready for download." });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ 
          title: "Export failed", 
          description: err.response?.data?.detail || "Could not generate export file.", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select defaultValue="csv">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="json" disabled>JSON (.json)</SelectItem>
                <SelectItem value="xlsx" disabled>Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">JSON and Excel exports coming soon.</p>
          </div>

          <div className="space-y-3">
            <Label>Include Fields</Label>
            {["Contact Info", "Call Duration", "Outcome", "Sentiment", "Cost", "Transcript"].map((field) => (
              <div key={field} className="flex items-center gap-2 opacity-70">
                <Checkbox id={field} checked disabled />
                <label htmlFor={field} className="text-sm">{field}</label>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Standard export includes all available fields.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={exportContacts.isPending}>
            {exportContacts.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            {exportContacts.isPending ? "Generating..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
