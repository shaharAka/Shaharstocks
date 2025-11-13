import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, TrendingUp, TrendingDown, Edit2, AlertTriangle, Check, Eye, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type PortfolioHolding, type Stock, type TradingRule } from "@shared/schema";

interface PortfolioManagementProps {
  holdings: PortfolioHolding[];
  stocks: Stock[];
  rules: TradingRule[];
  isLoading: boolean;
}

export function PortfolioManagement({ holdings, stocks, rules, isLoading }: PortfolioManagementProps) {
  const { toast } = useToast();
  const [editingRule, setEditingRule] = useState<TradingRule | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [newTriggerValue, setNewTriggerValue] = useState<number>(0);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<PortfolioHolding | null>(null);
  const [sellQuantity, setSellQuantity] = useState<string>("");

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const rule = rules?.find(r => r.id === id);
      if (!rule || !rule.conditions || rule.conditions.length === 0) return;

      const updatedConditions = [...rule.conditions];
      updatedConditions[0] = {
        ...updatedConditions[0],
        value: value,
      };

      return await apiRequest("PATCH", `/api/rules/${id}`, {
        conditions: updatedConditions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Rule Updated",
        description: "Trading rule boundary has been updated successfully",
      });
      setRuleDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trading rule",
        variant: "destructive",
      });
    },
  });

  const sellMutation = useMutation({
    mutationFn: async ({ ticker, quantity }: { ticker: string; quantity: number }) => {
      return await apiRequest("POST", `/api/ibkr/trade`, {
        ticker,
        action: "sell",
        quantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] });
      toast({
        title: "Stock Sold",
        description: "Successfully sold shares",
      });
      setSellDialogOpen(false);
      setSelectedHolding(null);
      setSellQuantity("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sell shares. Please try again.",
        variant: "destructive",
      });
    },
  });


  const handleEditRule = (rule: TradingRule) => {
    if (!rule.conditions || rule.conditions.length === 0) return;
    setEditingRule(rule);
    setNewTriggerValue(rule.conditions[0].value);
    setRuleDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (!editingRule) return;
    updateRuleMutation.mutate({ id: editingRule.id, value: newTriggerValue });
  };

  const handleSellClick = (holding: PortfolioHolding) => {
    setSelectedHolding(holding);
    setSellQuantity(String(holding.quantity));
    setSellDialogOpen(true);
  };

  const handleSellConfirm = () => {
    if (!selectedHolding) return;
    
    const quantity = parseInt(sellQuantity);
    if (isNaN(quantity) || quantity <= 0 || quantity > selectedHolding.quantity) {
      toast({
        title: "Invalid Quantity",
        description: `Please enter a valid quantity between 1 and ${selectedHolding.quantity}`,
        variant: "destructive",
      });
      return;
    }

    sellMutation.mutate({ ticker: selectedHolding.ticker, quantity });
  };


  if (!holdings || holdings.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2" data-testid="text-no-holdings">No Portfolio Holdings</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Purchase stocks to start managing your portfolio with automated rules
          </p>
        </div>
      </Card>
    );
  }

  // Calculate active alerts (triggered and near-trigger)
  const alerts = useMemo(() => {
    if (!holdings || !stocks || !rules) return { triggered: [], nearTrigger: [] };
    
    const triggered: Array<{
      ticker: string;
      companyName: string;
      currentPrice: number;
      triggerPrice: number;
      alertType: 'stop_loss' | 'take_profit';
      rule: TradingRule;
      percentFromTrigger: number;
      holding: PortfolioHolding;
    }> = [];
    
    const nearTrigger: Array<{
      ticker: string;
      companyName: string;
      currentPrice: number;
      triggerPrice: number;
      alertType: 'stop_loss' | 'take_profit';
      rule: TradingRule;
      percentFromTrigger: number;
      holding: PortfolioHolding;
    }> = [];
    
    holdings.forEach((holding) => {
      const stock = stocks.find((s) => s.ticker === holding.ticker);
      if (!stock) return;
      
      const currentPrice = parseFloat(stock.currentPrice);
      const purchasePrice = parseFloat(holding.averagePurchasePrice);
      
      const applicableRules = rules.filter(
        (rule) =>
          rule.enabled &&
          (rule.action === "sell" || rule.action === "sell_all") &&
          (rule.scope === "all_holdings" || 
           (rule.scope === "specific_stock" && rule.ticker === stock.ticker))
      );
      
      applicableRules.forEach((rule) => {
        if (!rule.conditions || rule.conditions.length === 0) return;
        
        const condition = rule.conditions[0];
        let triggerPrice = 0;
        
        if (condition.metric === "price_change_percent") {
          triggerPrice = purchasePrice * (1 + condition.value / 100);
        } else if (condition.metric === "price_change_from_close_percent") {
          const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
          triggerPrice = previousClose * (1 + condition.value / 100);
        } else if (condition.metric === "price_absolute") {
          triggerPrice = condition.value;
        }
        
        const isStopLoss = (condition.operator === "<" || condition.operator === "<=");
        const isTakeProfit = (condition.operator === ">" || condition.operator === ">=");
        
        const percentFromTrigger = ((currentPrice - triggerPrice) / triggerPrice) * 100;
        const nearTriggerThreshold = 5; // 5% from trigger
        
        // Check if alert is triggered
        let isTriggered = false;
        let isNearTrigger = false;
        
        if (isStopLoss) {
          if (currentPrice <= triggerPrice) {
            isTriggered = true;
          } else if (Math.abs(percentFromTrigger) <= nearTriggerThreshold) {
            isNearTrigger = true;
          }
        } else if (isTakeProfit) {
          if (currentPrice >= triggerPrice) {
            isTriggered = true;
          } else if (Math.abs(percentFromTrigger) <= nearTriggerThreshold) {
            isNearTrigger = true;
          }
        }
        
        const alertData = {
          ticker: stock.ticker,
          companyName: stock.companyName,
          currentPrice,
          triggerPrice,
          alertType: isStopLoss ? 'stop_loss' as const : 'take_profit' as const,
          rule,
          percentFromTrigger,
          holding,
        };
        
        if (isTriggered) {
          triggered.push(alertData);
        } else if (isNearTrigger) {
          nearTrigger.push(alertData);
        }
      });
    });
    
    return { triggered, nearTrigger };
  }, [holdings, stocks, rules]);

  const [showNearTrigger, setShowNearTrigger] = useState(true);

  return (
    <>
      <Card data-testid="card-active-alerts">
        <CardHeader>
          <div className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Active Alerts</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Stocks that have triggered or are approaching your trading rules
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNearTrigger(!showNearTrigger)}
              data-testid="button-toggle-near-trigger"
            >
              {showNearTrigger ? "Hide" : "Show"} Near-Trigger
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Triggered Alerts */}
          {alerts.triggered.length > 0 && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold">Triggered Alerts ({alerts.triggered.length})</h3>
              </div>
              <div className="space-y-2">
                {alerts.triggered.map((alert, index) => (
                  <div
                    key={`triggered-${index}`}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-md border bg-card hover-elevate"
                    data-testid={`alert-triggered-${alert.ticker}`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{alert.ticker}</h4>
                            <Badge variant={alert.alertType === 'stop_loss' ? 'destructive' : 'default'}>
                              {alert.alertType === 'stop_loss' ? 'Stop Loss' : 'Take Profit'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{alert.companyName}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Current:</span>
                          <span className="ml-1 font-mono font-semibold">${alert.currentPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trigger:</span>
                          <span className="ml-1 font-mono">${alert.triggerPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">From Trigger:</span>
                          <span className={`ml-1 font-mono font-semibold ${
                            alert.alertType === 'stop_loss' ? 'text-destructive' : 'text-success'
                          }`}>
                            {alert.percentFromTrigger > 0 ? '+' : ''}{alert.percentFromTrigger.toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Shares:</span>
                          <span className="ml-1 font-mono">{alert.holding.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRule(alert.rule)}
                        data-testid={`button-edit-rule-${alert.ticker}`}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit Rule
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSellClick(alert.holding)}
                        data-testid={`button-sell-${alert.ticker}`}
                      >
                        Sell
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Near-Trigger Alerts */}
          {showNearTrigger && alerts.nearTrigger.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Near-Trigger Alerts ({alerts.nearTrigger.length})</h3>
                <span className="text-xs text-muted-foreground">(Within 5% of trigger)</span>
              </div>
              <div className="space-y-2">
                {alerts.nearTrigger.map((alert, index) => (
                  <div
                    key={`near-${index}`}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-md border bg-card hover-elevate"
                    data-testid={`alert-near-${alert.ticker}`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{alert.ticker}</h4>
                            <Badge variant="outline">
                              {alert.alertType === 'stop_loss' ? 'Stop Loss' : 'Take Profit'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{alert.companyName}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Current:</span>
                          <span className="ml-1 font-mono font-semibold">${alert.currentPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trigger:</span>
                          <span className="ml-1 font-mono">${alert.triggerPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">From Trigger:</span>
                          <span className="ml-1 font-mono">
                            {alert.percentFromTrigger > 0 ? '+' : ''}{alert.percentFromTrigger.toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Shares:</span>
                          <span className="ml-1 font-mono">{alert.holding.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRule(alert.rule)}
                        data-testid={`button-edit-rule-${alert.ticker}`}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit Rule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {alerts.triggered.length === 0 && (showNearTrigger ? alerts.nearTrigger.length === 0 : true) && (
            <div className="text-center py-12">
              <Check className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2" data-testid="text-no-alerts">No Active Alerts</h3>
              <p className="text-sm text-muted-foreground">
                All your stocks are within safe trading ranges. Check back regularly for updates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent data-testid="dialog-adjust-rule">
          <DialogHeader>
            <DialogTitle>Adjust Sell Boundary</DialogTitle>
            <DialogDescription>
              Move the {editingRule?.conditions?.[0] && (editingRule.conditions[0].operator === "<" || editingRule.conditions[0].operator === "<=") ? "stop-loss" : "take-profit"} line by changing the trigger value
            </DialogDescription>
          </DialogHeader>

          {editingRule && editingRule.conditions && editingRule.conditions.length > 0 && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium mb-2">{editingRule.name}</p>
                <p className="text-xs text-muted-foreground">
                  {editingRule.scope === "all_holdings" ? "Applies to all holdings" : `Applies to ${editingRule.ticker}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger-value">
                  Trigger Value {editingRule.conditions[0].metric.includes("percent") ? "(%)" : "($)"}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="trigger-value"
                    type="number"
                    step="any"
                    value={newTriggerValue}
                    onChange={(e) => setNewTriggerValue(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                    data-testid="input-trigger-value"
                  />
                  <span className="text-sm text-muted-foreground">
                    {editingRule.conditions[0].operator}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editingRule.conditions[0].metric === "price_change_percent" && 
                    "Percentage change from purchase price (negative = loss, positive = gain)"}
                  {editingRule.conditions[0].metric === "price_change_from_close_percent" && 
                    "Percentage change from previous day's close"}
                  {editingRule.conditions[0].metric === "price_absolute" && 
                    "Absolute price level in dollars"}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRuleDialogOpen(false)}
                  data-testid="button-cancel-adjust"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveRule}
                  disabled={updateRuleMutation.isPending}
                  data-testid="button-save-adjust"
                >
                  {updateRuleMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent data-testid="dialog-sell-stock">
          <DialogHeader>
            <DialogTitle>Sell Shares</DialogTitle>
            <DialogDescription>
              {selectedHolding && stocks && (
                <>
                  Sell shares of {selectedHolding.ticker} ({stocks.find(s => s.ticker === selectedHolding.ticker)?.companyName})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedHolding && stocks && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sell-quantity">
                  Quantity (shares)
                </Label>
                <Input
                  id="sell-quantity"
                  type="number"
                  min="1"
                  max={selectedHolding.quantity}
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(e.target.value)}
                  className="font-mono"
                  data-testid="input-sell-quantity"
                />
                <p className="text-xs text-muted-foreground">
                  You currently hold {selectedHolding.quantity} shares. Max: {selectedHolding.quantity}
                </p>
              </div>

              <div className="rounded-md bg-muted p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Current Price</span>
                  <span className="font-mono font-semibold" data-testid="text-sell-price">
                    ${parseFloat(stocks.find(s => s.ticker === selectedHolding.ticker)?.currentPrice || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Estimated Total</span>
                  <span className="text-lg font-mono font-semibold" data-testid="text-sell-total">
                    ${sellQuantity && stocks.find(s => s.ticker === selectedHolding.ticker) ? 
                      (parseFloat(stocks.find(s => s.ticker === selectedHolding.ticker)!.currentPrice) * parseInt(sellQuantity)).toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setSellDialogOpen(false)}
              data-testid="button-cancel-sell"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={handleSellConfirm}
              disabled={sellMutation.isPending}
              data-testid="button-confirm-sell"
            >
              {sellMutation.isPending ? "Selling..." : "Confirm Sell"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
