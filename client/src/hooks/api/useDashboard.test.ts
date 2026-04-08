import { describe, expect, it } from "vitest";

import { mapCampaignListItemToDashboardCampaign } from "@/hooks/api/useDashboard";

describe("mapCampaignListItemToDashboardCampaign", () => {
  it("maps backend campaign list fields to dashboard fields", () => {
    const mapped = mapCampaignListItemToDashboardCampaign({
      id: "camp_1",
      name: "Outbound Q2",
      status: "live",
      agent_name: "Sales Agent",
      contacts_total: 120,
      contacts_reached: 45,
      calls_successful: 18,
      total_spend_cents: 9900,
    });

    expect(mapped).toEqual({
      id: "camp_1",
      name: "Outbound Q2",
      status: "live",
      total_contacts: 120,
      processed_contacts: 45,
      success_count: 18,
      cost_cents: 9900,
      agent_name: "Sales Agent",
    });
  });
});
