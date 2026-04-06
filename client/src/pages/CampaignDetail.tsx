import { useParams } from "react-router-dom";
import { useCampaignStore } from "@/store/useCampaignStore";
import { useCampaignDetailQuery, useCampaignMutations } from "@/hooks/api/useCampaigns";
import { CampaignHeader } from "@/components/campaign-detail/CampaignHeader";
import { CampaignTabsNav } from "@/components/campaign-detail/CampaignTabsNav";
import { DashboardTab } from "@/components/campaign-detail/tabs/DashboardTab";
import { AgentsTab } from "@/components/campaign-detail/tabs/AgentsTab";
import { ContactsTab } from "@/components/campaign-detail/tabs/ContactsTab";
import { CallsTab } from "@/components/campaign-detail/tabs/CallsTab";
import { PhonesTab } from "@/components/campaign-detail/tabs/PhonesTab";
import { KnowledgeBaseTab, IntegrationsTab } from "@/components/campaign-detail/tabs/KnowledgeBaseTab";
import { AnalyticsTab, SettingsTab } from "@/components/campaign-detail/tabs/AnalyticsTab";

// Dialogs
import { BuyPhoneNumberDialog } from "@/components/dialogs/BuyPhoneNumberDialog";
import { UploadDocumentDialog } from "@/components/dialogs/UploadDocumentDialog";
import { ConnectIntegrationDialog } from "@/components/dialogs/ConnectIntegrationDialog";
import { UploadContactsDialog } from "@/components/dialogs/UploadContactsDialog";
import { DeleteConfirmDialog } from "@/components/dialogs/DeleteConfirmDialog";
import { ExportDataDialog } from "@/components/dialogs/ExportDataDialog";
import { AddContactDialog } from "@/components/dialogs/AddContactDialog";
import { ImportContactsDialog } from "@/components/dialogs/ImportContactsDialog";

export default function CampaignDetail() {
  const { id } = useParams();
  const { 
    activeTab, 
    dialogStates, 
    setDialogState, 
    selectedIntegration 
  } = useCampaignStore();

  const { isLoading } = useCampaignDetailQuery(id);
  const { 
    addContact,
    importContacts,
    uploadKnowledgeFile,
    addKnowledgeUrl
  } = useCampaignMutations(id);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading campaign...</div>;
  }

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardTab />;
      case "agents": return <AgentsTab />;
      case "contacts": return <ContactsTab />;
      case "calls": return <CallsTab />;
      case "phones": return <PhonesTab />;
      case "knowledge": return <KnowledgeBaseTab />;
      case "integrations": return <IntegrationsTab />;
      case "analytics": return <AnalyticsTab />;
      case "settings": return <SettingsTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <CampaignHeader />
      <CampaignTabsNav />
      
      <div className="mt-6">
        {renderTab()}
      </div>

      {/* Dialogs managed by store */}
      <BuyPhoneNumberDialog 
        open={dialogStates.buyNumber} 
        onOpenChange={(open) => setDialogState("buyNumber", open)} 
      />
      <UploadDocumentDialog 
        open={dialogStates.uploadDoc} 
        onOpenChange={(open) => setDialogState("uploadDoc", open)} 
        onUploadFile={(file) => uploadKnowledgeFile.mutate(file)}
        onAddUrl={(url) => addKnowledgeUrl.mutate({ url, name: url })}
      />
      <ConnectIntegrationDialog 
        open={dialogStates.connectIntegration} 
        onOpenChange={(open) => setDialogState("connectIntegration", open)} 
        integration={selectedIntegration}
      />
      <UploadContactsDialog 
        open={dialogStates.uploadContacts} 
        onOpenChange={(open) => setDialogState("uploadContacts", open)} 
      />
      <AddContactDialog 
        open={dialogStates.addContact} 
        onOpenChange={(open) => setDialogState("addContact", open)} 
        onAdd={(data) => addContact.mutate(data)}
      />
      <ImportContactsDialog 
        open={dialogStates.importContacts} 
        onOpenChange={(open) => setDialogState("importContacts", open)} 
        onImport={(file) => importContacts.mutate(file)}
      />
      <ExportDataDialog 
        open={dialogStates.export} 
        onOpenChange={(open) => setDialogState("export", open)} 
      />
      <DeleteConfirmDialog 
        open={dialogStates.deleteConfirm} 
        onOpenChange={(open) => setDialogState("deleteConfirm", open)}
        title="Delete Confirmation"
        description="Are you sure you want to perform this action?"
        onConfirm={() => setDialogState("deleteConfirm", false)}
      />
    </div>
  );
}
