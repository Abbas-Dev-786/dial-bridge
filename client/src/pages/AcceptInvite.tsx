import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthMutations } from "@/hooks/api/useAuth";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuthMutations();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid invitation link.");
      return;
    }

    acceptInvite.mutate(token, {
      onSuccess: () => {
        setStatus("success");
        // Wait a bit before redirecting
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      },
      onError: (err: any) => {
        setStatus("error");
        setError(err.response?.data?.detail || "Failed to accept invitation. The link may be expired or invalid.");
      }
    });
  }, [token, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl border bg-card shadow-xl space-y-6">
        {status === "loading" && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 bg-background rounded-full" />
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Processing Invitation</h1>
            <p className="text-muted-foreground">Please wait while we add you to the workspace...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome Aboard!</h1>
            <p className="text-muted-foreground">Your invitation has been accepted. Redirecting you to the dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-destructive">Invitation Failed</h1>
            <p className="text-muted-foreground">{error}</p>
            <div className="pt-4">
              <Button 
                onClick={() => navigate("/dashboard")} 
                className="w-full"
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}
