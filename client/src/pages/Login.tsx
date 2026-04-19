import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useToast } from "@/hooks/use-toast";
import { useAuthMutations } from "@/hooks/api/useAuth";
import { getErrorMessage } from "@/lib/utils";
import { requestGoogleIdToken } from "@/lib/googleAuth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { fetchWorkspaces, setActiveWorkspaceId } = useWorkspaceStore();
  const { login, googleLogin } = useAuthMutations();
  const { toast } = useToast();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    login.mutate({ email: data.email, password: data.password }, {
      onSuccess: () => {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate(from, { replace: true });
      },
      onError: (error: any) => {
        console.error("Login failed:", error);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: getErrorMessage(error),
        });
      }
    });
  };

  const handleGoogleSignIn = async () => {
    if (!googleClientId) {
      toast({
        variant: "destructive",
        title: "Google Sign-In unavailable",
        description: "VITE_GOOGLE_CLIENT_ID is not configured.",
      });
      return;
    }

    setIsGooglePending(true);
    try {
      const idToken = await requestGoogleIdToken(googleClientId);
      await googleLogin.mutateAsync({ id_token: idToken });
      
      // Check for workspaces
      await fetchWorkspaces();
      const { workspaces, activeWorkspaceId } = useWorkspaceStore.getState();

      if (workspaces.length === 0) {
        toast({
          title: "Account created!",
          description: "Welcome! Now let's set up your workspace.",
        });
        navigate("/signup"); // Signup page handles step 2 (workspace creation)
        return;
      }

      if (!activeWorkspaceId) {
        setActiveWorkspaceId(workspaces[0].id);
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in with Google.",
      });
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Google Sign-In failed",
        description: getErrorMessage(error),
      });
    } finally {
      setIsGooglePending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Phone className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your DialBridge account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSignIn}
            disabled={isGooglePending}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isGooglePending ? "Signing in with Google..." : "Continue with Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              {...register("email")}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className={errors.password ? "border-destructive" : ""}
            />
            {errors.password && (
              <p className="text-xs font-medium text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="remember" onCheckedChange={(checked) => {
              // Note: react-hook-form integration with Radix Checkbox
              // In a real app, you'd use Controller or a wrapper
            }} />
            <Label htmlFor="remember" className="text-sm font-normal">
              Remember me
            </Label>
          </div>
          <Button className="w-full" type="submit" disabled={login.isPending}>
            {login.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
