import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (!code) {
        setStatus("error");
        setError("Missing authorization code from provider.");
        return;
      }

      try {
        // Send the code and state back to our API to complete the OAuth flow
        await api.post("/api/v1/workspaces/oauth/callback", {
          code,
          state,
        });

        setStatus("success");
        toast({
          title: "Integration Connected",
          description: "Your integration has been successfully connected.",
        });

        // Redirect back to integrations after a short delay
        setTimeout(() => {
          navigate("/integrations");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setError(err.response?.data?.detail || "Failed to complete integration. Please try again.");
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl border bg-card shadow-xl space-y-6">
        {status === "loading" && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
              Connecting Integration
            </h1>
            <p className="text-muted-foreground">
              Finalizing authentication with the provider...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Connected!</h1>
            <p className="text-muted-foreground">Successfully integrated. Redirecting you...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-destructive">Connection Failed</h1>
            <p className="text-muted-foreground">{error}</p>
            <div className="pt-4">
              <Button 
                onClick={() => navigate("/integrations")} 
                className="w-full"
                variant="outline"
              >
                Back to Integrations
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
