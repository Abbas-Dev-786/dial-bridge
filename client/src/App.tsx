import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
const Login = lazy(() => import("@/pages/Login"));
const SignUp = lazy(() => import("@/pages/SignUp"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const AgentsList = lazy(() => import("@/pages/AgentsList"));
const AgentDetail = lazy(() => import("@/pages/AgentDetail"));
const AgentConversation = lazy(() => import("@/pages/AgentConversation"));
const AgentConversationHistory = lazy(() => import("@/pages/AgentConversationHistory"));
const CampaignsList = lazy(() =>
  import("@/pages/CampaignsList").then((module) => ({ default: module.CampaignsList }))
);
const CampaignDetail = lazy(() => import("@/pages/CampaignDetail"));
const CallLogs = lazy(() => import("@/pages/CallLogs"));
const CallDetail = lazy(() => import("@/pages/CallDetail"));
const PhoneNumbers = lazy(() => import("@/pages/PhoneNumbers"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const WebhookLogs = lazy(() => import("@/pages/WebhookLogs"));
const GeneralSettings = lazy(() => import("@/pages/SettingsGeneral"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const SettingsTeam = lazy(() => import("@/pages/SettingsTeam"));
const SettingsBilling = lazy(() => import("@/pages/SettingsBilling"));
const SettingsAPI = lazy(() => import("@/pages/SettingsAPI"));
const SettingsNotifications = lazy(() => import("@/pages/SettingsNotifications"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
import { SettingsLayout } from "@/components/settings/SettingsLayout";

import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Dashboard */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/agents" element={<AgentsList />} />
                  <Route path="/agents/:id" element={<AgentDetail />} />
                  <Route path="/agents/:id/chat" element={<AgentConversation />} />
                  <Route path="/agents/:id/history" element={<AgentConversationHistory />} />
                  <Route path="/campaigns" element={<CampaignsList />} />
                  <Route path="/campaigns/:id" element={<CampaignDetail />} />
                  <Route path="/calls" element={<CallLogs />} />
                  <Route path="/calls/:id" element={<CallDetail />} />
                  <Route path="/phone-numbers" element={<PhoneNumbers />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route
                    path="/integrations/oauth/callback"
                    element={<OAuthCallback />}
                  />
                  <Route
                    path="/integrations/webhooks"
                    element={<WebhookLogs />}
                  />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route
                    path="/accept-invite/:token"
                    element={<AcceptInvite />}
                  />

                  {/* Settings with shared layout */}
                  <Route element={<SettingsLayout />}>
                    <Route path="/settings" element={<GeneralSettings />} />
                    <Route path="/settings/team" element={<SettingsTeam />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
