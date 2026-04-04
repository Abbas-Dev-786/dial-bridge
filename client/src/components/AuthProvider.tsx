import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Loader2 } from "lucide-react";
import { setupInterceptors } from "@/lib/api";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, fetchMe, logout } = useAuthStore();
  const { init, activeWorkspaceId } = useWorkspaceStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set up global getter for workspaceRequest utility to avoid circular imports
    (window as any).getActiveWorkspaceId = () => useWorkspaceStore.getState().activeWorkspaceId;

    // Set up axios interceptors with store access
    setupInterceptors(
      () => useAuthStore.getState().token,
      () => useWorkspaceStore.getState().activeWorkspaceId,
      () => useAuthStore.getState().logout(),
      () => useAuthStore.getState().refreshTokens()
    );

    const initializeAuth = async () => {
      if (token) {
        try {
          // Promise.all to fetch user and workspace info simultaneously
          await Promise.all([
            fetchMe(),
            init(),
          ]);
        } catch (error) {
          console.error("Initialization failed:", error);
        }
      }
      setIsReady(true);
    };

    initializeAuth();
  }, [token, fetchMe, init]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
