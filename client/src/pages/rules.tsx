import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "@/contexts/UserContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings, Plus, Trash2, Edit, Play, Pause, TrendingDown, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTradingRuleSchema, type TradingRule, type Stock } from "@shared/schema";

const ruleFormSchema = insertTradingRuleSchema.extend({
  conditionMetric: z.enum(["price_change_percent", "price_absolute", "price_change_from_close_percent"]),
  conditionOperator: z.enum([">", "<", ">=", "<=", "=="]),
  conditionValue: z.coerce.number(),
  actionQuantity: z.coerce.number().int().positive().optional(),
  actionPercentage: z.coerce.number().min(1).max(100).optional(),
});

type RuleFormData = z.infer<typeof ruleFormSchema>;

export default function Rules() {
  const { user } = useUser();
  const { toast } = useToast();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TradingRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: "",
      enabled: true,
      scope: "all_holdings",
      ticker: undefined,
      conditions: [],
      action: "sell",
      actionParams: undefined,
      conditionMetric: "price_change_percent",
      conditionOperator: "<",
      conditionValue: -7,
      actionQuantity: undefined,
      actionPercentage: undefined,
    },
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<TradingRule[]>({
    queryKey: ["/api/rules", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/rules", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rules");
      return res.json();
    },
  });

  const { data: stocks } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: RuleFormData) => {
      const { conditionMetric, conditionOperator, conditionValue, actionQuantity, actionPercentage, ...rest } = data;
      const rule = {
        ...rest,
        conditions: [{
          metric: conditionMetric,
          operator: conditionOperator,
          value: conditionValue,
        }],
        actionParams: actionQuantity 
          ? { quantity: actionQuantity } 
          : actionPercentage 
          ? { percentage: actionPercentage }
          : undefined,
      };
      return await apiRequest("POST", "/api/rules", rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules", user?.id] });
      toast({
        title: "Rule Created",
        description: "Trading rule has been created successfully",
      });
      form.reset();
      setRuleDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create trading rule",
        variant: "destructive",
      });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RuleFormData }) => {
      const { conditionMetric, conditionOperator, conditionValue, actionQuantity, actionPercentage, ...rest } = data;
      const rule = {
        ...rest,
        conditions: [{
          metric: conditionMetric,
          operator: conditionOperator,
          value: conditionValue,
        }],
        actionParams: actionQuantity 
          ? { quantity: actionQuantity } 
          : actionPercentage 
          ? { percentage: actionPercentage }
          : undefined,
      };
      return await apiRequest("PATCH", `/api/rules/${id}`, rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules", user?.id] });
      toast({
        title: "Rule Updated",
        description: "Trading rule has been updated successfully",
      });
      form.reset();
      setEditingRule(null);
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

  const toggleRuleEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return await apiRequest("PATCH", `/api/rules/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules", user?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle trading rule",
        variant: "destructive",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/rules/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules", user?.id] });
      toast({
        title: "Rule Deleted",
        description: "Trading rule has been deleted successfully",
      });
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trading rule",
        variant: "destructive",
      });
    },
  });

  const openCreateDialog = () => {
    setEditingRule(null);
    form.reset({
      name: "",
      enabled: true,
      scope: "all_holdings",
      ticker: undefined,
      conditions: [],
      action: "sell",
      actionParams: undefined,
      conditionMetric: "price_change_percent",
      conditionOperator: "<",
      conditionValue: -7,
      actionQuantity: undefined,
      actionPercentage: 100,
    });
    setRuleDialogOpen(true);
  };

  const openEditDialog = (rule: TradingRule) => {
    setEditingRule(rule);
    const condition = rule.conditions && rule.conditions.length > 0 ? rule.conditions[0] : null;
    form.reset({
      name: rule.name,
      enabled: rule.enabled,
      scope: rule.scope || "all_holdings",
      ticker: rule.ticker || undefined,
      conditions: rule.conditions,
      action: rule.action,
      actionParams: rule.actionParams,
      conditionMetric: (condition?.metric as any) || "price_change_percent",
      conditionOperator: (condition?.operator as any) || "<",
      conditionValue: condition?.value || -7,
      actionQuantity: rule.actionParams?.quantity,
      actionPercentage: rule.actionParams?.percentage,
    });
    setRuleDialogOpen(true);
  };

  const onSubmitRule = (data: RuleFormData) => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const toggleRuleEnabled = (rule: TradingRule) => {
    toggleRuleEnabledMutation.mutate({ id: rule.id, enabled: !rule.enabled });
  };

  const handleDeleteRule = (id: string) => {
    setRuleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const getConditionText = (rule: TradingRule) => {
    if (!rule.conditions || rule.conditions.length === 0) return "No conditions";
    const cond = rule.conditions[0];
    
    const metricLabels: Record<string, string> = {
      price_change_percent: "price change",
      price_absolute: "price",
      price_change_from_close_percent: "change from close",
    };
    
    const operatorLabels: Record<string, string> = {
      ">": "above",
      "<": "below",
      ">=": "at or above",
      "<=": "at or below",
      "==": "equals",
    };
    
    const metricLabel = metricLabels[cond.metric] || cond.metric;
    const operatorLabel = operatorLabels[cond.operator] || cond.operator;
    
    if (cond.metric.includes("percent")) {
      return `${metricLabel} ${operatorLabel} ${cond.value > 0 ? "+" : ""}${cond.value}%`;
    }
    return `${metricLabel} ${operatorLabel} $${cond.value}`;
  };

  const getScopeText = (rule: TradingRule) => {
    if (rule.scope === "specific_stock" && rule.ticker) {
      return rule.ticker;
    }
    if (rule.scope === "all_holdings") {
      return "All holdings";
    }
    return rule.scope || "All holdings";
  };

  const getActionText = (rule: TradingRule) => {
    const actionText = rule.action.toUpperCase();
    if (rule.actionParams?.quantity) {
      return `${actionText} ${rule.actionParams.quantity} shares`;
    }
    if (rule.actionParams?.percentage) {
      return `${actionText} ${rule.actionParams.percentage}% of position`;
    }
    if (rule.action === "sell_all") {
      return "SELL ALL (100%)";
    }
    return actionText;
  };

  const scope = form.watch("scope");
  const action = form.watch("action");
  const conditionMetric = form.watch("conditionMetric");

  if (rulesLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold whitespace-nowrap" data-testid="text-page-title">
            Trading Rules
          </h1>
        </div>
        <Button size="sm" onClick={openCreateDialog} data-testid="button-create-rule">
          <Plus className="h-4 w-4 mr-1" />
          Create Rule
        </Button>
      </div>

      {!rules || rules.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-rules">No Trading Rules</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create trigger-based rules like "Sell if price drops 7% below purchase price"
            </p>
            <Button onClick={openCreateDialog} data-testid="button-create-first-rule">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Rule
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} data-testid={`card-rule-${rule.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</CardTitle>
                      <Badge variant={rule.enabled ? "default" : "secondary"} data-testid={`badge-status-${rule.id}`}>
                        {rule.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription data-testid={`text-rule-description-${rule.id}`}>
                      <span className="font-medium">{getScopeText(rule)}</span>
                      {" - "}
                      When {getConditionText(rule)}, then {getActionText(rule)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${rule.id}`} className="text-xs text-muted-foreground">
                        {rule.enabled ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      </Label>
                      <Switch
                        id={`toggle-${rule.id}`}
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRuleEnabled(rule)}
                        data-testid={`switch-toggle-${rule.id}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(rule)}
                      data-testid={`button-edit-${rule.id}`}
                      className="h-11 w-11"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRule(rule.id)}
                      data-testid={`button-delete-${rule.id}`}
                      className="h-11 w-11"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-rule">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingRule ? "Edit Trading Rule" : "Create Trading Rule"}
            </DialogTitle>
            <DialogDescription>
              Create trigger-based rules like stop-loss or take-profit strategies
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitRule)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Stop Loss 7%" data-testid="input-rule-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apply To</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-scope">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all_holdings">All Holdings</SelectItem>
                        <SelectItem value="specific_stock">Specific Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {scope === "all_holdings" ? "Rule applies to all stocks in your portfolio" : "Rule applies to a specific stock only"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {scope === "specific_stock" && (
                <FormField
                  control={form.control}
                  name="ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Ticker</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticker">
                            <SelectValue placeholder="Select stock" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stocks?.map((stock) => (
                            <SelectItem key={stock.ticker} value={stock.ticker}>
                              {stock.ticker} - {stock.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="space-y-2">
                <Label>Trigger Condition</Label>
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name="conditionMetric"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-metric">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="price_change_percent">% from purchase</SelectItem>
                            <SelectItem value="price_change_from_close_percent">% from close</SelectItem>
                            <SelectItem value="price_absolute">Absolute price</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="conditionOperator"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-operator">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value=">">Above</SelectItem>
                            <SelectItem value="<">Below</SelectItem>
                            <SelectItem value=">=">At or above</SelectItem>
                            <SelectItem value="<=">At or below</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="conditionValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            placeholder={conditionMetric === "price_absolute" ? "100.00" : "-7"}
                            data-testid="input-value"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {conditionMetric === "price_change_percent" && "Example: -7 means 7% loss from purchase price"}
                  {conditionMetric === "price_change_from_close_percent" && "Example: -5 means 5% drop from previous close"}
                  {conditionMetric === "price_absolute" && "Example: 100 triggers when price reaches $100"}
                </p>
              </div>

              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-action">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sell">Sell (partial or %)</SelectItem>
                        <SelectItem value="sell_all">Sell All (100%)</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="notify">Notify Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {action !== "notify" && action !== "sell_all" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="actionQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity (shares)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                            placeholder="Leave empty for %"
                            data-testid="input-action-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actionPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Or Percentage (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                            placeholder="e.g., 100"
                            data-testid="input-action-percentage"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRuleDialogOpen(false)}
                  data-testid="button-cancel-rule"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  data-testid="button-save-rule"
                >
                  {createRuleMutation.isPending || updateRuleMutation.isPending
                    ? "Saving..."
                    : editingRule
                    ? "Update Rule"
                    : "Create Rule"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trading Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the trading rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ruleToDelete && deleteRuleMutation.mutate(ruleToDelete)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
