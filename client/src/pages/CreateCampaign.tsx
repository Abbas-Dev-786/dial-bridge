import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Upload } from "lucide-react";

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-sm text-muted-foreground">Set up a new outbound campaign</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Campaign Details</h3>
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <Input placeholder="e.g. Q2 Product Launch" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Assign Agent</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales-bot">Sales Bot</SelectItem>
                <SelectItem value="outreach-pro">Outreach Pro</SelectItem>
                <SelectItem value="survey-agent">Survey Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Contacts</h3>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Upload CSV file</p>
            <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
            <Button variant="outline" size="sm" className="mt-3">Browse Files</Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-semibold">Schedule & Rules</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Calling Window</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select window" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="9-17">9:00 AM — 5:00 PM</SelectItem>
                  <SelectItem value="10-18">10:00 AM — 6:00 PM</SelectItem>
                  <SelectItem value="8-20">8:00 AM — 8:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Retries</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No retries</SelectItem>
                  <SelectItem value="1">1 retry</SelectItem>
                  <SelectItem value="2">2 retries</SelectItem>
                  <SelectItem value="3">3 retries</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Retry Interval</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="4h">4 hours</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/campaigns")}>Cancel</Button>
          <Button>Launch Campaign</Button>
        </div>
      </div>
    </div>
  );
}
