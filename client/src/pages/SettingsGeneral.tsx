import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">General Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your workspace</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Workspace */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Workspace</h3>
          <div className="space-y-2">
            <Label>Workspace Name</Label>
            <Input defaultValue="Acme Corp" />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select defaultValue="est">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="est">Eastern (UTC-5)</SelectItem>
                <SelectItem value="cst">Central (UTC-6)</SelectItem>
                <SelectItem value="pst">Pacific (UTC-8)</SelectItem>
                <SelectItem value="utc">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary/10 text-primary border-0">Pro</Badge>
              <span className="text-sm text-muted-foreground">1,250 / 5,000 calls this period</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Created</Label>
            <p className="text-sm text-muted-foreground">January 10, 2025</p>
          </div>
        </div>

        {/* ElevenLabs Connection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ElevenLabs Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-success">API Key Connected</p>
                <p className="text-xs text-muted-foreground">Your ElevenLabs API key is active and verified</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">$247.60</p>
                <p className="text-xs text-muted-foreground">Credits Remaining</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">$752.40</p>
                <p className="text-xs text-muted-foreground">Credits Used</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input value="sk-el-••••••••••••••••••••" readOnly className="font-mono text-sm" />
                <Button variant="outline" size="sm">Update</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defaults */}
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Defaults</h3>
          <div className="space-y-2">
            <Label>Default Voice</Label>
            <Select defaultValue="aria">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aria">Aria (English US)</SelectItem>
                <SelectItem value="marcus">Marcus (English US)</SelectItem>
                <SelectItem value="sophie">Sophie (English UK)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Language</Label>
            <Select defaultValue="en-us">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en-us">English (US)</SelectItem>
                <SelectItem value="en-gb">English (UK)</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <div>
              <p className="text-sm font-medium">Call Recording</p>
              <p className="text-xs text-muted-foreground">Record all calls by default</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-destructive">Danger Zone</p>
                <p className="text-sm text-muted-foreground">Permanently delete this workspace and all associated data.</p>
              </div>
              <Button variant="destructive" size="sm">Delete Workspace</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
