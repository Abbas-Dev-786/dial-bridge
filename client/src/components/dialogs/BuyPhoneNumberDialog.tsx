import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, MapPin, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const availableNumbers = [
  { number: "+1 (555) 900-1001", type: "Local", region: "New York, NY", price: "$1.50/mo" },
  { number: "+1 (555) 900-1002", type: "Local", region: "San Francisco, CA", price: "$1.50/mo" },
  { number: "+1 (800) 900-1003", type: "Toll-free", region: "United States", price: "$3.00/mo" },
  { number: "+1 (555) 900-1004", type: "Local", region: "Chicago, IL", price: "$1.50/mo" },
  { number: "+1 (888) 900-1005", type: "Toll-free", region: "United States", price: "$3.00/mo" },
];

interface BuyPhoneNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyPhoneNumberDialog({ open, onOpenChange }: BuyPhoneNumberDialogProps) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = availableNumbers.filter((n) => {
    const matchesSearch = n.number.includes(search) || n.region.toLowerCase().includes(search.toLowerCase());
    const matchesType = type === "all" || n.type.toLowerCase() === type;
    return matchesSearch && matchesType;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buy Phone Number</DialogTitle>
          <DialogDescription>Search and purchase a new phone number for your campaigns.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by area code or region..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="toll-free">Toll-free</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
            {filtered.map((n) => (
              <button
                key={n.number}
                onClick={() => setSelected(n.number)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                  selected === n.number && "border-primary bg-primary/5 ring-1 ring-primary"
                )}
              >
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium">{n.number}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{n.region}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="text-xs">{n.type}</Badge>
                  <p className="text-xs font-medium mt-1">{n.price}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">No numbers found. Try a different search.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!selected} onClick={() => onOpenChange(false)}>
            <DollarSign className="mr-1.5 h-3.5 w-3.5" /> Purchase Number
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
