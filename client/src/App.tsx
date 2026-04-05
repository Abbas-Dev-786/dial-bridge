import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import { DashboardLayout } from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import AgentsList from "@/pages/AgentsList";
import CreateAgent from "@/pages/CreateAgent";
import AgentDetail from "@/pages/AgentDetail";

import CampaignsList from "@/pages/CampaignsList";

import CampaignDetail from "@/pages/CampaignDetail";
import CallLogs from "@/pages/CallLogs";
import CallDetail from "@/pages/CallDetail";
import PhoneNumbers from "@/pages/PhoneNumbers";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Integrations from "@/pages/Integrations";
import WebhookLogs from "@/pages/WebhookLogs";
import GeneralSettings from "@/pages/SettingsGeneral";
import AuditLogs from "@/pages/AuditLogs";
import SettingsTeam from "@/pages/SettingsTeam";
import SettingsBilling from "@/pages/SettingsBilling";
import SettingsAPI from "@/pages/SettingsAPI";
import SettingsNotifications from "@/pages/SettingsNotifications";
import NotFound from "@/pages/NotFound";
import LandingPage from "@/pages/LandingPage";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

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
                <Route path="/agents/new" element={<CreateAgent />} />
                <Route path="/agents/:id" element={<AgentDetail />} />
                
                <Route path="/campaigns" element={<CampaignsList />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/calls" element={<CallLogs />} />
                <Route path="/calls/:id" element={<CallDetail />} />
                <Route path="/phone-numbers" element={<PhoneNumbers />} />
                <Route path="/knowledge" element={<KnowledgeBase />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/integrations/webhooks" element={<WebhookLogs />} />
                
                {/* Settings with shared layout */}
                <Route element={<SettingsLayout />}>
                  <Route path="/settings" element={<GeneralSettings />} />
                  <Route path="/settings/team" element={<SettingsTeam />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
