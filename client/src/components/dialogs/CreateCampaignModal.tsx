import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Upload, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const availableAgents = [
  { id: "1", name: "Sales Bot Pro", model: "GPT-4o", activeCampaign: "Q1 Outreach" as string | null },
  { id: "2", name: "Support AI", model: "Claude 3.5 Sonnet", activeCampaign: null },
  { id: "3", name: "Outreach Pro", model: "GPT-4o Mini", activeCampaign: null },
  { id: "4", name: "Follow-up Agent", model: "GPT-4o", activeCampaign: "Re-engagement" as string | null },
  { id: "5", name: "Survey Agent", model: "Gemini 1.5 Flash", activeCampaign: null },
];

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignModal({ open, onOpenChange }: CreateCampaignModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [kbUrl, setKbUrl] = useState("");

  const handleLaunch = () => {
    if (!name.trim() || !goalDescription.trim() || !selectedAgent) return;

    toast({
      title: "Campaign created as Draft",
      description: "Add contacts to launch.",
    });
    onOpenChange(false);
    navigate("/campaigns");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>Set up a new outbound calling campaign</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label>Campaign Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Q2 Product Launch"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
            />
            <p className="text-xs text-muted-foreground text-right">{name.length}/80</p>
          </div>

          {/* Campaign Goal */}
          <div className="space-y-2">
            <Label>Campaign Goal <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="e.g. Reach out to trial users who haven't booked a demo yet and schedule a 15-min product walkthrough"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value.slice(0, 200))}
              className="min-h-[80px] text-sm"
            />
            <div className="flex justify-between">
              <p className="text-xs text-muted-foreground">Briefly describe what this campaign should achieve — this guides the agent's behavior.</p>
              <p className="text-xs text-muted-foreground shrink-0 ml-2">{goalDescription.length}/200</p>
            </div>
          </div>

          {/* Assign Agent */}
          <div className="space-y-2">
            <Label>Assign Agent <span className="text-destructive">*</span></Label>
            <TooltipProvider>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => {
                    const isUnavailable = !!agent.activeCampaign;
                    return (
                      <Tooltip key={agent.id}>
                        <TooltipTrigger asChild>
                          <SelectItem
                            value={agent.id}
                            disabled={isUnavailable}
                            className={cn(isUnavailable && "opacity-50")}
                          >
                            <span>{agent.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({agent.model})</span>
                          </SelectItem>
                        </TooltipTrigger>
                        {isUnavailable && (
                          <TooltipContent side="right">
                            <p className="text-xs">Currently active in {agent.activeCampaign}. Pause that campaign to use this agent.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </SelectContent>
              </Select>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground">Agents already in an active campaign are unavailable.</p>
          </div>

          {/* Optional Setup */}
          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showOptional && "rotate-180")} />
                Optional setup
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-4">
              {/* CSV Upload */}
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
                <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                <p className="text-sm font-medium">Upload contacts CSV</p>
                <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
                <Button variant="outline" size="sm" className="mt-2">Browse Files</Button>
              </div>

              {/* Knowledge Base */}
              <div className="space-y-3">
                <Label className="text-xs">Knowledge Base (optional)</Label>
                <p className="text-xs text-muted-foreground -mt-2">Upload documents or add URLs — the agent will use these during calls.</p>
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
                  <FileText className="h-5 w-5 text-muted-foreground mb-1" />
                  <p className="text-xs font-medium">Drop documents here</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, CSV up to 50MB</p>
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-xs">Upload</Button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="https://docs.example.com"
                      value={kbUrl}
                      onChange={(e) => setKbUrl(e.target.value)}
                      className="h-8 text-sm pl-8"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs">Add URL</Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Calling Number</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-assign</SelectItem>
                      <SelectItem value="1">+1 (555) 100-2000</SelectItem>
                      <SelectItem value="2">+1 (555) 200-3000</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">The number your contacts will see.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Calling Hours</Label>
                  <Select defaultValue="business">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business hours (9-5)</SelectItem>
                      <SelectItem value="extended">Extended (8-8)</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Retries</Label>
                  <Select defaultValue="2">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No retries</SelectItem>
                      <SelectItem value="1">1 retry</SelectItem>
                      <SelectItem value="2">2 retries</SelectItem>
                      <SelectItem value="3">3 retries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleLaunch} disabled={!name.trim() || !goalDescription.trim() || !selectedAgent}>
              Launch Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
