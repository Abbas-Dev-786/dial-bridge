import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, Check, Globe, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useToast } from "@/hooks/use-toast";
import { useAuthMutations } from "@/hooks/api/useAuth";
import { getErrorMessage } from "@/lib/utils";
import { requestGoogleIdToken } from "@/lib/googleAuth";

// Schema for Step 1: User Registration
const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Schema for Step 2: Workspace Creation
const workspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(80),
  slug: z.string().min(2, "Slug must be at least 2 characters").max(40).regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  timezone: z.string().default("UTC"),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export default function SignUp() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const navigate = useNavigate();
  const { fetchWorkspaces, setActiveWorkspaceId } = useWorkspaceStore();
  const { signup, createWorkspace, googleLogin } = useAuthMutations();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  // Step 1 Form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  // Step 2 Form
  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      slug: "",
      timezone: "UTC",
    },
  });

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    signup.mutate({
      email: data.email,
      password: data.password,
      full_name: data.fullName,
    }, {
      onSuccess: () => {
        setStep(2);
        toast({
          title: "Account created!",
          description: "Now let's set up your workspace.",
        });
      },
      onError: (error: any) => {
        console.error("Registration failed:", error);
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: getErrorMessage(error),
        });
      }
    });
  };

  const onWorkspaceSubmit = async (data: WorkspaceFormValues) => {
    createWorkspace.mutate(data, {
      onSuccess: async (workspace) => {
        await fetchWorkspaces();
        setActiveWorkspaceId(workspace.id);
        
        toast({
          title: "Workspace created!",
          description: "Welcome to DialBridge.",
        });

        navigate("/dashboard");
      },
      onError: (error: any) => {
        console.error("Workspace creation failed:", error);
        toast({
          variant: "destructive",
          title: "Workspace Setup Failed",
          description: getErrorMessage(error),
        });
      }
    });
  };

  const handleGoogleSignUp = async () => {
    if (!googleClientId) {
      toast({
        variant: "destructive",
        title: "Google Sign-Up unavailable",
        description: "VITE_GOOGLE_CLIENT_ID is not configured.",
      });
      return;
    }

    setIsGooglePending(true);
    try {
      const idToken = await requestGoogleIdToken(googleClientId);
      await googleLogin.mutateAsync({ id_token: idToken });

      await fetchWorkspaces();
      const { workspaces, activeWorkspaceId } = useWorkspaceStore.getState();

      if (workspaces.length === 0) {
        setStep(2);
        toast({
          title: "Account created!",
          description: "Now let's set up your workspace.",
        });
        return;
      }

      if (!activeWorkspaceId) {
        setActiveWorkspaceId(workspaces[0].id);
      }

      toast({
        title: "Welcome to DialBridge!",
        description: "Signed in with Google successfully.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Google Sign-Up failed",
        description: getErrorMessage(error),
      });
    } finally {
      setIsGooglePending(false);
    }
  };

  // Helper to auto-generate slug from name
  const updateSlug = (name: string) => {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    workspaceForm.setValue("slug", slug, { shouldValidate: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Phone className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {step === 1 ? "Create your account" : "Set up your workspace"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 1 ? "Enter your details to get started" : "Tell us about your organization"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleSignUp}
              disabled={isGooglePending}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {isGooglePending ? "Signing up with Google..." : "Continue with Google"}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  placeholder="John Doe" 
                  {...registerForm.register("fullName")}
                  className={registerForm.formState.errors.fullName ? "border-destructive" : ""}
                />
                {registerForm.formState.errors.fullName && (
                  <p className="text-xs font-medium text-destructive">{registerForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Work email</Label>
                <Input 
                  id="register-email" 
                  type="email" 
                  placeholder="you@company.com" 
                  {...registerForm.register("email")}
                  className={registerForm.formState.errors.email ? "border-destructive" : ""}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-xs font-medium text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input 
                  id="register-password" 
                  type="password" 
                  placeholder="Min 8 characters" 
                  {...registerForm.register("password")}
                  className={registerForm.formState.errors.password ? "border-destructive" : ""}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-xs font-medium text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button className="w-full" type="submit" disabled={signup.isPending}>
                {signup.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Workspace Name</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="ws-name" 
                    className={cn("pl-9", workspaceForm.formState.errors.name ? "border-destructive" : "")}
                    placeholder="My Organization" 
                    {...workspaceForm.register("name", { 
                      onChange: (e) => updateSlug(e.target.value) 
                    })}
                  />
                </div>
                {workspaceForm.formState.errors.name && (
                  <p className="text-xs font-medium text-destructive">{workspaceForm.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ws-slug">Workspace Slug</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="ws-slug" 
                    className={cn("pl-9", workspaceForm.formState.errors.slug ? "border-destructive" : "")}
                    placeholder="my-org" 
                    {...workspaceForm.register("slug")}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Your workspace will be available at dialbridge.io/<b>{workspaceForm.watch("slug") || "your-slug"}</b>
                </p>
                {workspaceForm.formState.errors.slug && (
                  <p className="text-xs font-medium text-destructive">{workspaceForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => setStep(1)} 
                className="flex-1"
                disabled={workspaceForm.formState.isSubmitting}
              >
                Back
              </Button>
              <Button 
                className="flex-1" 
                type="submit" 
                disabled={createWorkspace.isPending}
              >
                {createWorkspace.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing...</>
                ) : (
                  "Finish Setup"
                )}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
