import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CAMPAIGN_TABS } from "@/lib/campaign-constants";
import { useCampaignStore } from "@/store/useCampaignStore";

export function CampaignTabsNav() {
  const { activeTab, setActiveTab } = useCampaignStore();

  return (
    <div className="border-b -mx-1">
      <ScrollArea className="w-full">
        <div className="flex gap-0.5 px-1 pb-px">
          {CAMPAIGN_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                activeTab === tab.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
