import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Send, Save, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
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
    refetchInterval: 5000,
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
      const res = await apiRequest("POST", "/api/telegram/fetch", { limit });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      toast({
        title: "Messages fetched successfully",
        description: data.message || `Fetched ${data.messagesFetched} messages`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fetch Telegram messages.",
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
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure data sources for stock recommendations
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

      <OpenInsiderConfigSection />
    </div>
  );
}

function OpenInsiderConfigSection() {
  const { toast } = useToast();
  const [openinsiderEnabled, setOpeninsiderEnabled] = useState(false);
  const [fetchLimit, setFetchLimit] = useState(50);
  const [fetchInterval, setFetchInterval] = useState<"hourly" | "daily">("hourly");
  const [insiderTitles, setInsiderTitles] = useState<string[]>([]);
  const [minTransactionValue, setMinTransactionValue] = useState<number | null>(null);
  const [fetchPreviousDayOnly, setFetchPreviousDayOnly] = useState(false);

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
      setFetchPreviousDayOnly(config.fetchPreviousDayOnly || false);
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
        fetchPreviousDayOnly,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openinsider/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      toast({
        title: "Settings saved",
        description: "OpenInsider configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save OpenInsider configuration.",
        variant: "destructive",
      });
    },
  });

  const fetchOpeninsiderDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/openinsider/fetch", {});
      return await res.json();
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
        description: error.message || "Failed to fetch OpenInsider data.",
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
            OpenInsider Configuration
          </CardTitle>
          <CardDescription>
            Fetch insider trading data from OpenInsider.com
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
                  Enable OpenInsider data source
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fetch-limit">Transactions per fetch (1-100)</Label>
                <Input
                  id="fetch-limit"
                  type="number"
                  min="1"
                  max="100"
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
          <CardTitle>OpenInsider Data Source</CardTitle>
          <CardDescription>
            Web scraping from OpenInsider.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Automated Data Collection</h4>
            <p className="text-xs text-muted-foreground">
              The system automatically scrapes insider trading data from OpenInsider.com every hour,
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
