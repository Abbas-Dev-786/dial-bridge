import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Form, FormControl, FormDescription, FormField, 
  FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  ChevronDown, Upload, FileText, Link2, 
  Loader2, Sparkles, CheckCircle2, AlertTriangle, 
  Bot, MessageSquare, ShieldCheck, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCampaignMutations } from "@/hooks/api/useCampaigns";

const campaignSchema = z.object({
  name: z.string()
    .min(2, "Campaign name must be at least 2 characters")
    .max(80, "Campaign name cannot exceed 80 characters"),
  goal_description: z.string()
    .min(10, "Goal description must be at least 10 characters")
    .max(500, "Goal description cannot exceed 500 characters"),
  // Optional settings
  max_retries: z.number().int().min(0).max(10).default(3),
  dnc_check_enabled: z.boolean().default(true),
  record_calls: z.boolean().default(true),
  tcpa_mode: z.boolean().default(true),
  voicemail_detection: z.boolean().default(true),
  leave_voicemail: z.boolean().default(false),
  caller_id_display_name: z.string().optional(),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AgentGenerationPreview {
  agent_name: string;
  first_message: string;
  system_prompt_preview: string;
  voice_name: string;
  was_generated: boolean;
  generation_failed: boolean;
  fallback_warning: string | null;
}

interface ImproveGoalResponse {
  improved_goal_description: string;
  was_improved: boolean;
  warning: string | null;
}

export function CreateCampaignModal({ open, onOpenChange }: CreateCampaignModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showOptional, setShowOptional] = useState(false);
  const [generationResult, setGenerationResult] = useState<AgentGenerationPreview | null>(null);

  const { createCampaign, improveGoal } = useCampaignMutations();
  const isGenerating = createCampaign.isPending;
  const isImprovingGoal = improveGoal.isPending;

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      goal_description: "",
      max_retries: 3,
      dnc_check_enabled: true,
      record_calls: true,
      tcpa_mode: true,
      voicemail_detection: true,
      leave_voicemail: false,
    },
  });

  const onSubmit = (data: CampaignFormValues) => {
    createCampaign.mutate(data, {
      onSuccess: (responseData: any) => {
        const result = responseData.agent_generation as AgentGenerationPreview;
        setGenerationResult(result);
        
        if (result.generation_failed) {
          toast({
            variant: "destructive",
            title: "Agent Generation Warning",
            description: result.fallback_warning || "AI failed to generate a custom agent. Using fallback configuration.",
          });
        } else {
          toast({
            title: "Campaign & Agent Created!",
            description: "Your AI agent has been successfully generated.",
          });
        }
      },
      onError: (error: any) => {
        console.error("Campaign creation failed:", error);
        toast({
          variant: "destructive",
          title: "Creation Failed",
          description: error.response?.data?.detail || "An error occurred while creating the campaign.",
        });
      }
    });
  };

  const handleImproveGoal = async () => {
    const currentGoal = form.getValues("goal_description").trim();
    if (currentGoal.length < 10) {
      toast({
        variant: "destructive",
        title: "Goal is too short",
        description: "Please write at least 10 characters before improving.",
      });
      return;
    }

    if (currentGoal.length > 500) {
      toast({
        variant: "destructive",
        title: "Goal is too long",
        description: "Please keep your goal within 500 characters before improving.",
      });
      return;
    }

    try {
      const response = await improveGoal.mutateAsync(currentGoal) as ImproveGoalResponse;
      form.setValue("goal_description", response.improved_goal_description, {
        shouldValidate: true,
        shouldDirty: true,
      });

      toast({
        title: response.was_improved ? "Goal Improved" : "Goal Checked",
        description:
          response.warning ||
          (response.was_improved
            ? "Your goal has been rewritten to be clearer and more actionable."
            : "Your goal already looks strong. No major rewrite was needed."),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not improve goal",
        description: error.response?.data?.detail || "Please try again in a moment.",
      });
    }
  };

  const handleFinish = () => {
    onOpenChange(false);
    setGenerationResult(null);
    form.reset();
    navigate("/campaigns");
  };

  const nameValue = form.watch("name");
  const goalValue = form.watch("goal_description");

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isGenerating) {
        onOpenChange(val);
        if (!val) {
          setGenerationResult(null);
          form.reset();
        }
      }
    }}>
      <DialogContent className={cn(
        "sm:max-w-[540px] max-h-[85vh] overflow-y-auto transition-all duration-300",
        generationResult && "sm:max-w-[600px]"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {generationResult ? (
              <><CheckCircle2 className="h-5 w-5 text-green-500" /> Agent Generated</>
            ) : (
              "Create Campaign"
            )}
          </DialogTitle>
          <DialogDescription>
            {generationResult 
              ? "Review your new AI agent's personality and settings" 
              : "Set up a new outbound calling campaign with AI-generated agents"}
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary animate-bounce fill-primary/20" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-lg text-foreground">AI is generating your agent...</p>
              <p className="text-sm text-muted-foreground animate-pulse">(This may take 2–5 seconds)</p>
            </div>
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-[bounce_1s_infinite_100ms]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-[bounce_1s_infinite_200ms]" />
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-[bounce_1s_infinite_300ms]" />
            </div>
          </div>
        ) : generationResult ? (
          <div className="space-y-6 pt-4 animate-in fade-in zoom-in duration-300">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg leading-none">{generationResult.agent_name}</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {generationResult.voice_name}
                  </Badge>
                  <Badge variant="outline">AI Generated</Badge>
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <MessageSquare className="h-3 w-3" />
                    First Message
                  </div>
                  <p className="text-sm italic border-l-2 border-primary/30 pl-3 py-1.5 bg-muted/30 rounded-r-md leading-relaxed">
                    "{generationResult.first_message}"
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <ShieldCheck className="h-3 w-3" />
                    System Prompt Preview
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {generationResult.system_prompt_preview}...
                  </p>
                </div>

                {generationResult.fallback_warning && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex gap-2 items-start">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-tight">
                      {generationResult.fallback_warning}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
              <Zap className="h-3 w-3 text-primary animate-pulse" />
              <span>Full configuration available in Campaign Details</span>
            </div>

            <Button className="w-full h-11 text-base font-semibold" onClick={handleFinish}>
              Go to Campaign Dashboard
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Campaign Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Q2 Product Launch" {...field} />
                    </FormControl>
                    <div className="flex justify-between items-center h-4">
                      <FormMessage className="text-[10px]" />
                      <p className="text-[10px] text-muted-foreground">{nameValue.length}/80</p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goal_description"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Campaign Goal <span className="text-destructive">*</span></FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 shrink-0"
                        onClick={handleImproveGoal}
                        disabled={isGenerating || isImprovingGoal || goalValue.trim().length < 10}
                      >
                        {isImprovingGoal ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Improving...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Improve
                          </>
                        )}
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Reach out to trial users who haven't booked a demo yet and schedule a 15-min product walkthrough"
                        className="min-h-[100px] text-sm resize-none"
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between">
                      <FormDescription className="text-xs leading-tight">
                        Describe what this campaign should achieve. AI uses this to generate your agent's personality and script.
                      </FormDescription>
                      <p className="text-xs text-muted-foreground shrink-0 ml-2">{goalValue.length}/500</p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Optional Setup */}
              <Collapsible open={showOptional} onOpenChange={setShowOptional}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showOptional && "rotate-180")} />
                    Advanced Configuration
                    {showOptional && <Badge variant="secondary" className="ml-2 text-[10px] h-4 py-0">Custom</Badge>}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-5 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="max_retries"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs">Max Retries</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(parseInt(val))} 
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">No retries</SelectItem>
                              <SelectItem value="1">1 retry</SelectItem>
                              <SelectItem value="2">2 retries</SelectItem>
                              <SelectItem value="3">3 retries</SelectItem>
                              <SelectItem value="5">5 retries</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[10px]">Failed call attempts.</FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="caller_id_display_name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs">Caller ID Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Company Name" className="h-8 text-sm" {...field} />
                          </FormControl>
                          <FormDescription className="text-[10px]">Display name (branded calls).</FormDescription>
                        </FormItem>
                      )}
                    />

                    <div className="col-span-full border-t pt-4 mt-2">
                      <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                        < ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        Compliance & Call Settings
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="dnc_check_enabled"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-2 bg-muted/30">
                              <div className="space-y-0.5">
                                <FormLabel className="text-[10px] font-bold">DNC Check</FormLabel>
                                <p className="text-[9px] text-muted-foreground italic">Compliance filtering</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="record_calls"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-2 bg-muted/30">
                              <div className="space-y-0.5">
                                <FormLabel className="text-[10px] font-bold">Record Calls</FormLabel>
                                <p className="text-[9px] text-muted-foreground italic">Safety & analytics</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="voicemail_detection"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-2 bg-muted/30">
                              <div className="space-y-0.5">
                                <FormLabel className="text-[10px] font-bold">AMD</FormLabel>
                                <p className="text-[9px] text-muted-foreground italic">Detect machines</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="leave_voicemail"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-2 bg-muted/30">
                              <div className="space-y-0.5">
                                <FormLabel className="text-[10px] font-bold">Leave Message</FormLabel>
                                <p className="text-[9px] text-muted-foreground italic">AI drops VM</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <DialogFooter className="flex gap-2 pt-2 sm:justify-end">
                <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={isGenerating || isImprovingGoal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isGenerating || isImprovingGoal} className="min-w-[140px] gap-2">
                  Generate AI Agent
                  <Sparkles className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
