import { Button } from "@/components/ui/button";
import { ChevronLeft, Bot, Phone, Trash2, Monitor, Smartphone, ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AgentHeaderProps {
  id: string;
  name: string;
  status: string;
  onTestBrowser: () => void;
  onTestPhone: () => void;
  onDelete: () => void;
}

export function AgentHeader({ id, name, status, onTestBrowser, onTestPhone, onDelete }: AgentHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
              <StatusBadge status={status as any} />
            </div>
            <p className="text-xs text-muted-foreground font-mono">agent_{id}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Phone className="mr-2 h-4 w-4" /> Test Agent <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={onTestBrowser}>
              <Monitor className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>In Browser</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTestPhone}>
              <Smartphone className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>By Phone Call</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="destructive" size="icon" onClick={onDelete} id="delete-agent-btn">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
