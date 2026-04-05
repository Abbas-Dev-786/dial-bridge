import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { workspaceRequest } from "@/lib/api";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";
import { useNavigate } from "react-router-dom";

export default function GeneralSettings() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<any>(null);
  const [elevenLabs, setElevenLabs] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    async function loadData() {
      try {
        const [wsRes, elRes] = await Promise.all([
          workspaceRequest.get<{ name: string; timezone: string; created_at: string }>(""),
          workspaceRequest.get<{ is_configured: boolean }>("/settings/elevenlabs-status")
        ]);
        setWorkspace(wsRes.data);
        setElevenLabs(elRes.data);
        setName(wsRes.data.name);
        setTimezone(wsRes.data.timezone);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await workspaceRequest.patch("", { name, timezone });
      toast.success("Settings saved successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await workspaceRequest.delete("");
      toast.success("Workspace deleted");
      navigate("/workspaces"); // or wherever appropriate
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete workspace");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="max-w-2xl space-y-6">
        {/* Workspace */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Workspace</h3>
          <div className="space-y-2">
            <Label>Workspace Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Created</Label>
            <p className="text-sm text-muted-foreground">
              {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
              }) : "Unknown"}
            </p>
          </div>
        </div>

        {/* ElevenLabs Connection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-premium-600">ElevenLabs Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {elevenLabs?.is_configured ? (
              <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-3">
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-success">Active & Verified</p>
                  <p className="text-xs text-muted-foreground">Using platform-wide credentials</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Platform Key Missing</p>
                  <p className="text-xs text-muted-foreground">Please contact support to configure ElevenLabs</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Configuration Status</Label>
              <Input 
                value={elevenLabs?.is_configured ? "CONNECTED (PLATFORM)" : "NOT CONFIGURED"} 
                readOnly 
                className="bg-muted text-xs font-mono" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-destructive">Danger Zone</p>
                <p className="text-sm text-muted-foreground">Permanently delete this workspace and all associated data.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>Delete Workspace</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </div>
      </div>

      <DeleteConfirmDialog 
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Workspace"
        description="Are you sure you want to delete this workspace? This action is permanent and cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
