import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgentTest } from "@/hooks/api/useAgentTest";
import { usePhoneNumbersQuery } from "@/hooks/api/usePhoneNumbers";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

interface TestAgentPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
}

export function TestAgentPhoneDialog({
  open,
  onOpenChange,
  agentId,
}: TestAgentPhoneDialogProps) {
  const [toNumber, setToNumber] = useState("");
  const [selectedCallerId, setSelectedCallerId] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const { testAgentViaPhone } = useAgentTest(agentId);
  const { data: phoneNumbers, isLoading: isLoadingNumbers } = usePhoneNumbersQuery();

  // Auto-select first number if available
  useEffect(() => {
    if (phoneNumbers && phoneNumbers.length > 0 && !selectedCallerId) {
      setSelectedCallerId(phoneNumbers[0].id);
    }
  }, [phoneNumbers, selectedCallerId]);

  const handleTestCall = () => {
    if (!toNumber) {
      toast({
        title: "Missing Number",
        description: "Please enter a phone number to call.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedCallerId) {
      toast({
        title: "Missing Caller ID",
        description: "Please select a phone number to call from.",
        variant: "destructive",
      });
      return;
    }

    testAgentViaPhone.mutate(
      { to_number: toNumber, phone_number_id: selectedCallerId },
      {
        onSuccess: () => {
          toast({
            title: "Call Initiated",
            description: "Your phone should ring shortly.",
          });
          onOpenChange(false);
          setToNumber("");
        },
        onError: (err: any) => {
          toast({
            title: "Call Failed",
            description: err.response?.data?.detail || "Could not initiate test call.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const hasNumbers = phoneNumbers && phoneNumbers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Test via Phone Call</DialogTitle>
          <DialogDescription>
            Enter your phone number and receive a call from this agent instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isLoadingNumbers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasNumbers ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive mb-3">
                You need an imported phone number in this workspace to make outbound calls.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-destructive/20 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/phone-numbers");
                }}
              >
                Go to Phone Numbers
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="caller_id">Caller ID (From)</Label>
                <Select value={selectedCallerId} onValueChange={setSelectedCallerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a phone number" />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneNumbers.map((num: any) => (
                      <SelectItem key={num.id} value={num.id}>
                        {num.number} {num.friendly_name ? `(${num.friendly_name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="to_number">Destination Number (To)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="to_number"
                    placeholder="+1234567890"
                    className="pl-9"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Format: Include country code (e.g. +1 for US)
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleTestCall} 
            disabled={!hasNumbers || testAgentViaPhone.isPending}
          >
            {testAgentViaPhone.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calling...
              </>
            ) : (
              "Call Me"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
