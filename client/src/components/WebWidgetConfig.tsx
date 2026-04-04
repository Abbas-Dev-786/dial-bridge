import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, ExternalLink, Code, Globe, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WebWidgetConfigProps {
  agentId?: string;
  className?: string;
}

export function WebWidgetConfig({ agentId = "agent_xxxxx", className }: WebWidgetConfigProps) {
  const { toast } = useToast();
  const [widgetPosition, setWidgetPosition] = useState("bottom-right");
  const [primaryColor, setPrimaryColor] = useState("#f97316");
  const [showAvatar, setShowAvatar] = useState(true);
  const [autoGreet, setAutoGreet] = useState(false);

  const embedCode = `<script src="https://elevenlabs.io/convai-widget/index.js" async></script>
<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>`;

  const reactCode = `import { useConversation } from "@elevenlabs/react";

function VoiceAgent() {
  const conversation = useConversation({
    onConnect: () => console.log("Connected"),
    onDisconnect: () => console.log("Disconnected"),
    onError: (error) => console.error(error),
  });

  const startConversation = async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    await conversation.startSession({
      agentId: "${agentId}",
    });
  };

  return (
    <div>
      <p>Status: {conversation.status}</p>
      <button onClick={startConversation}>Start</button>
      <button onClick={() => conversation.endSession()}>Stop</button>
    </div>
  );
}`;

  const shareLink = `https://elevenlabs.io/convai/${agentId}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs defaultValue="widget">
        <TabsList>
          <TabsTrigger value="widget" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Widget</TabsTrigger>
          <TabsTrigger value="react" className="gap-1.5"><Code className="h-3.5 w-3.5" /> React SDK</TabsTrigger>
          <TabsTrigger value="share" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> Share Link</TabsTrigger>
        </TabsList>

        <TabsContent value="widget" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Widget Position</Label>
              <Select value={widgetPosition} onValueChange={setWidgetPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-9 p-1 cursor-pointer" />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Show Avatar</Label>
                <p className="text-xs text-muted-foreground">Display agent avatar in the widget</p>
              </div>
              <Switch checked={showAvatar} onCheckedChange={setShowAvatar} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Auto-greet Visitors</Label>
                <p className="text-xs text-muted-foreground">Automatically open widget and greet after delay</p>
              </div>
              <Switch checked={autoGreet} onCheckedChange={setAutoGreet} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Embed Code</Label>
            <div className="relative">
              <pre className="rounded-xl border bg-muted p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap">{embedCode}</pre>
              <Button
                variant="outline" size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(embedCode, "Embed code")}
              >
                <Copy className="mr-1.5 h-3 w-3" /> Copy
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="react" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>React SDK Integration</Label>
            <p className="text-xs text-muted-foreground">
              Install with <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm install @elevenlabs/react</code>
            </p>
            <div className="relative">
              <pre className="rounded-xl border bg-muted p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap">{reactCode}</pre>
              <Button
                variant="outline" size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(reactCode, "React code")}
              >
                <Copy className="mr-1.5 h-3 w-3" /> Copy
              </Button>
            </div>
          </div>
          <a href="https://elevenlabs.io/docs/agents-platform/libraries/react" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> View full SDK docs
          </a>
        </TabsContent>

        <TabsContent value="share" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Shareable Link</Label>
            <p className="text-xs text-muted-foreground">Share this link for anyone to test your agent in the browser</p>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={() => copyToClipboard(shareLink, "Share link")}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.open(shareLink, "_blank")}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in New Tab
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
