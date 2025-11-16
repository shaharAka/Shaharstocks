import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings as SettingsIcon, Send, Save, RefreshCw, CheckCircle2, XCircle, CreditCard, Clock, AlertTriangle, ExternalLink, Crown, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type TelegramConfig, type OpeninsiderConfig } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [channelUsername, setChannelUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [enabled, setEnabled] = useState(true);
  
  // Authentication state
  const [authPhoneNumber, setAuthPhoneNumber] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [authStep, setAuthStep] = useState<'idle' | 'code-sent' | 'authenticated'>('idle');

  // Fetch logging system
  type FetchLog = {
    timestamp: string;
    source: 'telegram' | 'openinsider';
    action: 'attempt' | 'success' | 'error';
    details: string;
    data?: any;
  };
  
  const [fetchLogs, setFetchLogs] = useState<FetchLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  
  const addLog = (source: 'telegram' | 'openinsider', action: 'attempt' | 'success' | 'error', details: string, data?: any) => {
    const log: FetchLog = {
      timestamp: new Date().toISOString(),
      source,
      action,
      details,
      data
    };
    setFetchLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
  };
  
  const copyLogsToClipboard = () => {
    const logsText = fetchLogs.map(log => {
      let text = `[${new Date(log.timestamp).toLocaleString()}] ${log.source.toUpperCase()} - ${log.action.toUpperCase()}: ${log.details}`;
      if (log.data) {
        text += `\nData: ${JSON.stringify(log.data, null, 2)}`;
      }
      return text;
    }).join('\n\n' + '='.repeat(80) + '\n\n');
    
    navigator.clipboard.writeText(logsText);
    toast({
      title: "Logs copied",
      description: "Fetch logs have been copied to clipboard",
    });
  };
  
  const clearLogs = () => {
    setFetchLogs([]);
    toast({
      title: "Logs cleared",
      description: "All fetch logs have been cleared",
    });
  };

  // Feature flags
  const { data: featureFlags } = useQuery<{ enableTelegram: boolean }>({
    queryKey: ["/api/feature-flags"],
  });

  const { data: config, isLoading } = useQuery<Omit<TelegramConfig, 'sessionString'>>({
    queryKey: ["/api/telegram/config"],
    retry: false,
    enabled: featureFlags?.enableTelegram ?? false,
  });

  const { data: status } = useQuery<{ isConnected: boolean; hasClient: boolean }>({
    queryKey: ["/api/telegram/status"],
    // Removed aggressive polling - WebSocket invalidates cache on updates
    enabled: featureFlags?.enableTelegram ?? false,
  });

  // Synchronize form state with fetched config
  useEffect(() => {
    if (config) {
      setChannelUsername(config.channelUsername || "");
      setPhoneNumber(config.phoneNumber || "");
      setEnabled(config.enabled ?? true);
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/telegram/config", {
        channelUsername,
        phoneNumber: phoneNumber || undefined,
        enabled,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/status"] });
      toast({
        title: "Settings saved",
        description: "Your Telegram configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save Telegram configuration.",
        variant: "destructive",
      });
    },
  });

  const fetchMessagesMutation = useMutation({
    mutationFn: async (limit: number = 10) => {
      addLog('telegram', 'attempt', `Attempting to fetch ${limit} messages`, { limit });
      try {
        const res = await apiRequest("POST", "/api/telegram/fetch", { limit });
        const data = await res.json();
        addLog('telegram', 'success', `Successfully fetched ${data.messagesFetched || 0} messages`, data);
        return data;
      } catch (error: any) {
        addLog('telegram', 'error', `Fetch failed: ${error.message}`, { error: error.toString(), stack: error.stack });
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      toast({
        title: "Messages fetched successfully",
        description: data.message || `Fetched ${data.messagesFetched} messages`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch Telegram messages.",
        variant: "destructive",
      });
    },
  });

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/telegram/auth/send-code", {
        phoneNumber: authPhoneNumber,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setPhoneCodeHash(data.phoneCodeHash);
      setAuthStep('code-sent');
      toast({
        title: "Code sent",
        description: "Check your Telegram app for the verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code.",
        variant: "destructive",
      });
    },
  });

  const signInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/telegram/auth/sign-in", {
        phoneNumber: authPhoneNumber,
        phoneCode: verificationCode,
        phoneCodeHash,
      });
      return await res.json();
    },
    onSuccess: () => {
      setAuthStep('authenticated');
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/status"] });
      toast({
        title: "Authentication successful",
        description: "You can now fetch messages from Telegram channels.",
      });
      setAuthPhoneNumber("");
      setVerificationCode("");
      setPhoneCodeHash("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify code.",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfigMutation.mutate();
  };

  const handleFetchNow = () => {
    fetchMessagesMutation.mutate(100);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2" data-testid="text-page-title">
          <SettingsIcon className="h-6 w-6" />
          Fetch Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure data sources for insider trading opportunities
        </p>
      </div>

      {featureFlags?.enableTelegram && status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {status.isConnected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Connected to Telegram</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>Not Connected</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {featureFlags?.enableTelegram && !status?.isConnected && (
        <Card data-testid="card-telegram-auth">
          <CardHeader>
            <CardTitle>Authenticate with Telegram</CardTitle>
            <CardDescription>
              Enter your phone number to receive a verification code via Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {authStep === 'idle' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="auth-phone">Phone Number</Label>
                    <Input
                      id="auth-phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={authPhoneNumber}
                      onChange={(e) => setAuthPhoneNumber(e.target.value)}
                      data-testid="input-auth-phone"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code (e.g., +1 for USA)
                    </p>
                  </div>
                  <Button
                    onClick={() => sendCodeMutation.mutate()}
                    disabled={!authPhoneNumber || sendCodeMutation.isPending}
                    data-testid="button-send-code"
                  >
                    {sendCodeMutation.isPending ? "Sending..." : "Send Verification Code"}
                  </Button>
                </div>
              )}

              {authStep === 'code-sent' && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm">
                      Verification code sent to <strong>{authPhoneNumber}</strong>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="12345"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      data-testid="input-verification-code"
                    />
                    <p className="text-xs text-muted-foreground">
                      Check your Telegram app for the code
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => signInMutation.mutate()}
                      disabled={!verificationCode || signInMutation.isPending}
                      data-testid="button-verify-code"
                    >
                      {signInMutation.isPending ? "Verifying..." : "Verify Code"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAuthStep('idle');
                        setVerificationCode("");
                        setPhoneCodeHash("");
                      }}
                      data-testid="button-cancel-auth"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {featureFlags?.enableTelegram && (
      <Card data-testid="card-telegram-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Telegram Configuration
          </CardTitle>
          <CardDescription>
            Monitor a Telegram channel directly for insider trading notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="channel-username">Channel Username *</Label>
                <Input
                  id="channel-username"
                  type="text"
                  placeholder="InsiderTrading_SEC"
                  value={channelUsername}
                  onChange={(e) => setChannelUsername(e.target.value)}
                  required
                  data-testid="input-channel-username"
                />
                <p className="text-xs text-muted-foreground">
                  Telegram channel username (without the @ symbol)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number (Optional)</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  data-testid="input-phone-number"
                />
                <p className="text-xs text-muted-foreground">
                  Your phone number for Telegram authentication (for reference only)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  data-testid="switch-enabled"
                />
                <Label htmlFor="enabled" className="cursor-pointer">
                  Enable channel monitoring
                </Label>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={saveConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchNow}
                  disabled={fetchMessagesMutation.isPending || !channelUsername}
                  data-testid="button-fetch-now"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${fetchMessagesMutation.isPending ? 'animate-spin' : ''}`} />
                  {fetchMessagesMutation.isPending ? "Fetching..." : "Fetch Messages"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
      )}

      {featureFlags?.enableTelegram && (
      <Card data-testid="card-telegram-info">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Direct Telegram integration using GramJS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Direct Connection</h4>
            <p className="text-xs text-muted-foreground">
              The system connects directly to Telegram using your API credentials and monitors
              the <span className="font-mono">@{channelUsername || 'InsiderTrading_SEC'}</span> channel in real-time.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Message Processing</h4>
            <p className="text-xs text-muted-foreground">
              New messages from the channel are automatically parsed to extract:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>Stock ticker symbols</li>
              <li>Company names</li>
              <li>Insider trading information</li>
              <li>Transaction details</li>
            </ul>
          </div>

          {config?.lastSync && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Last Sync</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(config.lastSync).toLocaleString()}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-medium">API Credentials</h4>
            <p className="text-xs text-muted-foreground">
              Your Telegram API credentials (API ID and API Hash) are securely stored as environment variables.
            </p>
          </div>
        </CardContent>
      </Card>
      )}

      <OpenInsiderConfigSection addLog={addLog} />

      {/* Fetch Logs Viewer */}
      <Card data-testid="card-fetch-logs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fetch Logs</CardTitle>
              <CardDescription>
                Debug fetch attempts and errors (last 50 entries)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {fetchLogs.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLogsToClipboard}
                    data-testid="button-copy-logs"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearLogs}
                    data-testid="button-clear-logs"
                  >
                    Clear
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
                data-testid="button-toggle-logs"
              >
                {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showLogs && (
          <CardContent>
            {fetchLogs.filter(log => log.source !== 'openinsider').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No logs yet. Logs will appear here when you attempt to fetch data.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {fetchLogs.filter(log => log.source !== 'openinsider').map((log: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded text-xs font-mono border ${
                      log.action === 'error' ? 'bg-destructive/10 border-destructive' :
                      log.action === 'success' ? 'bg-success/10 border-success' :
                      'bg-muted border-border'
                    }`}
                    data-testid={`log-entry-${index}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.source === 'telegram' ? 'default' : 'secondary'}>
                          {log.source.toUpperCase()}
                        </Badge>
                        <Badge variant={
                          log.action === 'error' ? 'destructive' :
                          log.action === 'success' ? 'default' :
                          'outline'
                        }>
                          {log.action.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-foreground/90 mb-2">{log.details}</p>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View data
                        </summary>
                        <pre className="mt-2 p-2 bg-background rounded overflow-x-auto text-[10px]">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

interface User {
  id: number;
  name: string;
  email: string;
  subscriptionStatus: "trial" | "active" | "inactive" | "cancelled" | "expired";
  trialEndsAt?: string | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  paypalSubscriptionId?: string | null;
}

interface TrialStatus {
  status: string;
  isTrialActive: boolean;
  daysRemaining: number;
  trialEndsAt?: string;
  showPaymentReminder: boolean;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

function BillingManagementSection() {
  const { toast } = useToast();
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalButtonRendered, setPaypalButtonRendered] = useState(false);
  
  const { data: currentUser } = useQuery<{ user: User | null }>({
    queryKey: ["/api/auth/current-user"],
  });

  const { data: trialStatus } = useQuery<TrialStatus>({
    queryKey: ["/api/auth/trial-status"],
    enabled: currentUser?.user?.subscriptionStatus === "trial",
    retry: false,
  });

  const user = currentUser?.user;

  // Load PayPal SDK if user needs subscription
  useEffect(() => {
    const needsSubscription = user && (user.subscriptionStatus === "trial" || user.subscriptionStatus === "inactive" || user.subscriptionStatus === "expired" || user.subscriptionStatus === "cancelled");
    
    if (needsSubscription && !paypalLoaded) {
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
      if (!clientId) {
        console.error("PayPal client ID not configured");
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
      script.setAttribute('data-sdk-integration-source', 'button-factory');
      script.async = true;
      script.onload = () => {
        setPaypalLoaded(true);
      };
      document.body.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
    
    // Reset button state if user no longer needs subscription
    if (!needsSubscription && paypalButtonRendered) {
      setPaypalButtonRendered(false);
      setPaypalLoaded(false);
    }
  }, [user, paypalLoaded, paypalButtonRendered]);

  // Render PayPal button when SDK is ready
  useEffect(() => {
    if (paypalLoaded && window.paypal && user && !paypalButtonRendered) {
      const planId = import.meta.env.VITE_PAYPAL_PLAN_ID;
      if (!planId) {
        console.error("PayPal plan ID not configured");
        return;
      }

      // Clear container
      const container = document.getElementById('paypal-subscription-button');
      if (container) {
        container.innerHTML = '';
        
        window.paypal.Buttons({
          style: {
            shape: 'pill',
            color: 'silver',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: function(data: any, actions: any) {
            return actions.subscription.create({
              plan_id: planId,
              custom_id: user.email,
            });
          },
          onApprove: function(data: any, actions: any) {
            toast({
              title: "Subscription activated!",
              description: "Your subscription has been activated successfully. Enjoy full access!",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/current-user"] });
            setPaypalButtonRendered(false);
            setPaypalLoaded(false);
            return actions.subscription.get();
          },
          onError: function(err: any) {
            console.error("PayPal error:", err);
            toast({
              title: "Subscription failed",
              description: "There was an error processing your subscription. Please try again.",
              variant: "destructive",
            });
          }
        }).render('#paypal-subscription-button');
        
        setPaypalButtonRendered(true);
      }
    }
  }, [paypalLoaded, user, paypalButtonRendered, toast]);

  if (!user) {
    return null;
  }

  const getStatusBadge = () => {
    switch (user.subscriptionStatus) {
      case "trial":
        return <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" /> Free Trial</Badge>;
      case "active":
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      case "expired":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Expired</Badge>;
      default:
        return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  const showSubscribeButton = user.subscriptionStatus === "trial" || user.subscriptionStatus === "inactive" || user.subscriptionStatus === "expired" || user.subscriptionStatus === "cancelled";
  const showManageLink = user.subscriptionStatus === "active" && user.paypalSubscriptionId;

  return (
    <Card data-testid="card-billing-management">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Subscription
          </span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trial Information */}
        {user.subscriptionStatus === "trial" && trialStatus && (
          <Alert className="border-2">
            <div className="flex items-start gap-3">
              {trialStatus.daysRemaining <= 3 ? (
                <AlertTriangle className="h-5 w-5 mt-0.5 text-destructive" />
              ) : (
                <Clock className="h-5 w-5 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-sm">
                  {trialStatus.daysRemaining > 0 
                    ? `${trialStatus.daysRemaining} ${trialStatus.daysRemaining === 1 ? 'Day' : 'Days'} Left in Trial`
                    : "Trial Ending Today"
                  }
                </h4>
                <AlertDescription className="text-xs">
                  {trialStatus.daysRemaining <= 3
                    ? "Subscribe now to continue accessing all features after your trial ends."
                    : "Subscribe anytime to ensure uninterrupted access to all features."
                  }
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Expired Trial Message */}
        {user.subscriptionStatus === "expired" && (
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <div className="ml-2">
              <h4 className="font-semibold text-sm mb-1">Trial Expired</h4>
              <AlertDescription className="text-xs">
                Your 30-day free trial has ended. Subscribe now to regain access to your portfolio and recommendations.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Cancelled Subscription Message */}
        {user.subscriptionStatus === "cancelled" && (
          <Alert className="border-2">
            <XCircle className="h-5 w-5" />
            <div className="ml-2">
              <h4 className="font-semibold text-sm mb-1">Subscription Cancelled</h4>
              <AlertDescription className="text-xs">
                Your subscription has been cancelled. You can resubscribe anytime to regain access to all features.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Subscription Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <p className="text-sm font-medium capitalize" data-testid="text-subscription-status">
                {user.subscriptionStatus === "trial" ? "Free Trial" : user.subscriptionStatus}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Account</Label>
              <p className="text-sm font-medium truncate" data-testid="text-user-email">
                {user.email}
              </p>
            </div>
          </div>

          {user.subscriptionStartDate && (
            <div>
              <Label className="text-xs text-muted-foreground">
                {user.subscriptionStatus === "trial" ? "Trial Started" : "Subscription Started"}
              </Label>
              <p className="text-sm font-medium" data-testid="text-subscription-start">
                {new Date(user.subscriptionStartDate).toLocaleDateString()}
              </p>
            </div>
          )}

          {user.trialEndsAt && user.subscriptionStatus === "trial" && (
            <div>
              <Label className="text-xs text-muted-foreground">Trial Ends</Label>
              <p className="text-sm font-medium" data-testid="text-trial-ends">
                {new Date(user.trialEndsAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          {showSubscribeButton && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="h-4 w-4" />
                <span>Subscribe to Pro Plan - $10/month</span>
              </div>
              <div id="paypal-subscription-button" data-testid="container-paypal-button"></div>
            </div>
          )}

          {showManageLink && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Manage your subscription, update payment method, or cancel anytime through PayPal.
              </p>
              <Button
                variant="outline"
                size="default"
                asChild
                data-testid="button-manage-subscription"
              >
                <a
                  href="https://www.paypal.com/myaccount/autopay/connect/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Manage Subscription at PayPal
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OpenInsiderConfigSection({ addLog }: { addLog: (source: 'telegram' | 'openinsider', action: 'attempt' | 'success' | 'error', details: string, data?: any) => void }) {
  const { toast } = useToast();
  const [openinsiderEnabled, setOpeninsiderEnabled] = useState(false);
  const [fetchLimit, setFetchLimit] = useState(50);
  const [fetchInterval, setFetchInterval] = useState<"hourly" | "daily">("hourly");
  const [insiderTitles, setInsiderTitles] = useState<string[]>([]);
  const [minTransactionValue, setMinTransactionValue] = useState<number | null>(null);
  const [minMarketCap, setMinMarketCap] = useState(500);
  const [fetchPreviousDayOnly, setFetchPreviousDayOnly] = useState(false);
  const [optionsDealThreshold, setOptionsDealThreshold] = useState(15);
  const [minCommunityEngagement, setMinCommunityEngagement] = useState(10);

  const { data: config, isLoading } = useQuery<OpeninsiderConfig>({
    queryKey: ["/api/openinsider/config"],
    retry: false,
  });

  useEffect(() => {
    if (config) {
      setOpeninsiderEnabled(config.enabled ?? false);
      setFetchLimit(config.fetchLimit || 50);
      setFetchInterval((config.fetchInterval as "hourly" | "daily") || "hourly");
      setInsiderTitles(config.insiderTitles || []);
      setMinTransactionValue(config.minTransactionValue || null);
      setMinMarketCap(config.minMarketCap ?? 500);
      setFetchPreviousDayOnly(config.fetchPreviousDayOnly || false);
      setOptionsDealThreshold(config.optionsDealThresholdPercent ?? 15);
      setMinCommunityEngagement(config.minCommunityEngagement ?? 10);
    }
  }, [config]);

  const saveOpeninsiderConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/openinsider/config", {
        enabled: openinsiderEnabled,
        fetchLimit,
        fetchInterval,
        insiderTitles: insiderTitles.length > 0 ? insiderTitles : null,
        minTransactionValue: minTransactionValue && minTransactionValue > 0 ? minTransactionValue : null,
        minMarketCap: minMarketCap,
        fetchPreviousDayOnly,
        optionsDealThresholdPercent: optionsDealThreshold,
        minCommunityEngagement: minCommunityEngagement,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openinsider/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      toast({
        title: "Settings saved",
        description: "Insider trading data configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save insider trading data configuration.",
        variant: "destructive",
      });
    },
  });

  const fetchOpeninsiderDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/openinsider/fetch", {});
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/openinsider/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      toast({
        title: "Fetch successful",
        description: data.message || `Created ${data.created} new recommendations from ${data.total} transactions`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch insider trading data.",
        variant: "destructive",
      });
    },
  });

  const handleSaveOpeninsider = (e: React.FormEvent) => {
    e.preventDefault();
    saveOpeninsiderConfigMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="card-openinsider-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Insider Trading Data Configuration
          </CardTitle>
          <CardDescription>
            Fetch insider trading data from SEC regulatory filings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveOpeninsider} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="openinsider-enabled"
                  checked={openinsiderEnabled}
                  onCheckedChange={setOpeninsiderEnabled}
                  data-testid="switch-openinsider-enabled"
                />
                <Label htmlFor="openinsider-enabled" className="cursor-pointer">
                  Enable insider trading data source
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fetch-limit">Transactions per fetch (1-500)</Label>
                <Input
                  id="fetch-limit"
                  type="number"
                  min="1"
                  max="500"
                  value={fetchLimit}
                  onChange={(e) => setFetchLimit(parseInt(e.target.value) || 50)}
                  disabled={!openinsiderEnabled}
                  data-testid="input-fetch-limit"
                />
                <p className="text-xs text-muted-foreground">
                  Number of insider purchase transactions to fetch
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fetch-interval">Fetch Interval</Label>
                <Select
                  value={fetchInterval}
                  onValueChange={(value: "hourly" | "daily") => setFetchInterval(value)}
                  disabled={!openinsiderEnabled}
                >
                  <SelectTrigger id="fetch-interval" data-testid="select-fetch-interval">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How often to fetch new insider trading data
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="previous-day-only"
                  checked={fetchPreviousDayOnly}
                  onCheckedChange={setFetchPreviousDayOnly}
                  disabled={!openinsiderEnabled}
                  data-testid="switch-previous-day-only"
                />
                <Label htmlFor="previous-day-only" className="cursor-pointer">
                  Fetch previous day's transactions only
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insider-titles">Filter by Insider Titles (optional)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["CEO", "CFO", "Director", "President", "Officer", "VP", "Chairman"].map((title) => (
                    <Button
                      key={title}
                      type="button"
                      size="lg"
                      variant={insiderTitles.includes(title) ? "default" : "outline"}
                      onClick={() => {
                        if (insiderTitles.includes(title)) {
                          setInsiderTitles(insiderTitles.filter(t => t !== title));
                        } else {
                          setInsiderTitles([...insiderTitles, title]);
                        }
                      }}
                      disabled={!openinsiderEnabled}
                      data-testid={`button-toggle-title-${title.toLowerCase()}`}
                    >
                      {title}
                    </Button>
                  ))}
                </div>
                {insiderTitles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Filtering by: {insiderTitles.join(", ")}
                  </p>
                )}
                {insiderTitles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No filter - all insider titles will be included
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-transaction-value">Minimum Transaction Value (optional)</Label>
                <Input
                  id="min-transaction-value"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g., 100000"
                  value={minTransactionValue || ""}
                  onChange={(e) => setMinTransactionValue(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!openinsiderEnabled}
                  data-testid="input-min-transaction-value"
                />
                <p className="text-xs text-muted-foreground">
                  Filter transactions below this dollar amount (leave empty for no minimum)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-market-cap">Minimum Market Cap (millions)</Label>
                <Input
                  id="min-market-cap"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="500"
                  value={minMarketCap}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 500 : parseInt(e.target.value);
                    setMinMarketCap(isNaN(value) ? 500 : value);
                  }}
                  disabled={!openinsiderEnabled}
                  data-testid="input-min-market-cap"
                />
                <p className="text-xs text-muted-foreground">
                  Only include companies with market cap above this value (in millions). Default $500M filters out micro-cap stocks. Set to 0 to include all sizes.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="options-deal-threshold">Options Deal Filter (%)</Label>
                <Input
                  id="options-deal-threshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="15"
                  value={optionsDealThreshold}
                  onChange={(e) => setOptionsDealThreshold(parseInt(e.target.value) || 15)}
                  disabled={!openinsiderEnabled}
                  data-testid="input-options-deal-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  Insider purchase price must be at least this % of current market price. Set to 0 to disable filter. Default 15% filters out likely stock options deals.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-community-engagement">Minimum Community Engagement</Label>
                <Input
                  id="min-community-engagement"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="10"
                  value={minCommunityEngagement}
                  onChange={(e) => setMinCommunityEngagement(parseInt(e.target.value) || 10)}
                  disabled={!openinsiderEnabled}
                  data-testid="input-min-community-engagement"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum number of comments required for a stock to appear in the Community section. Default 10 shows only stocks with active discussions.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saveOpeninsiderConfigMutation.isPending}
              data-testid="button-save-openinsider-config"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveOpeninsiderConfigMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card data-testid="card-openinsider-info">
        <CardHeader>
          <CardTitle>Insider Trading Data Source</CardTitle>
          <CardDescription>
            Automated collection from SEC regulatory filings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Automated Data Collection</h4>
            <p className="text-xs text-muted-foreground">
              The system automatically collects insider trading data from SEC regulatory filings every hour,
              focusing on purchase transactions that indicate insider confidence.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Data Processing</h4>
            <p className="text-xs text-muted-foreground">
              Each transaction is analyzed to extract:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>Stock ticker symbols</li>
              <li>Purchase price and quantity</li>
              <li>Filing date (when information became public)</li>
              <li>Company and insider names</li>
            </ul>
          </div>

          {config?.lastSync && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Last Sync</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(config.lastSync).toLocaleString()}
              </p>
            </div>
          )}

          {config?.lastError && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600">Last Error</h4>
              <p className="text-xs text-muted-foreground text-red-600">
                {config.lastError}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Reliability</h4>
            <p className="text-xs text-muted-foreground">
              Built-in retry logic with exponential backoff ensures reliable data collection
              even during network issues or website throttling.
            </p>
          </div>

          <div className="pt-2 border-t">
            <Button
              onClick={() => fetchOpeninsiderDataMutation.mutate()}
              disabled={fetchOpeninsiderDataMutation.isPending || !config?.enabled}
              data-testid="button-fetch-openinsider-now"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${fetchOpeninsiderDataMutation.isPending ? 'animate-spin' : ''}`} />
              {fetchOpeninsiderDataMutation.isPending ? "Fetching..." : "Fetch Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
