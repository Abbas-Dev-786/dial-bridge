import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { BookOpen, FileText, File } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

const documents = [
  { id: "1", name: "Product Overview 2024.pdf", size: "2.4 MB", pages: 32, campaign: "Q1 Outreach", status: "live" as const, lastSync: "2 hrs ago" },
  { id: "2", name: "Pricing & Plans.pdf", size: "850 KB", pages: 8, campaign: "Q1 Outreach", status: "live" as const, lastSync: "1 day ago" },
  { id: "3", name: "FAQ Database", size: "1.1 MB", pages: 156, campaign: "Q1 Outreach", status: "live" as const, lastSync: "3 days ago" },
  { id: "4", name: "Launch Guide.docx", size: "3.8 MB", pages: 15, campaign: "Product Launch", status: "live" as const, lastSync: "5 hrs ago" },
  { id: "5", name: "Survey Questions.txt", size: "45 KB", pages: 3, campaign: "Survey Q1", status: "paused" as const, lastSync: "Syncing..." },
];

export default function KnowledgeBase() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">All documents across your campaigns. Upload & manage within each campaign.</p>
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="rounded-lg bg-primary/10 p-2.5">
                {doc.name.endsWith(".pdf") ? <FileText className="h-5 w-5 text-primary" /> : <File className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{doc.size} · {doc.pages} pages</p>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <Badge variant="secondary" className="text-xs font-normal">{doc.campaign}</Badge>
                <span className="text-xs text-muted-foreground">{doc.lastSync}</span>
                <StatusBadge status={doc.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="No documents yet" description="Upload documents within a campaign." actionLabel="Go to Campaigns" onAction={() => navigate("/campaigns")} />
      )}
    </div>
  );
}
