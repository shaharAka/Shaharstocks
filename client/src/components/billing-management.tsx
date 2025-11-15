import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, CreditCard, Clock, AlertTriangle, ExternalLink, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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

export function BillingManagement() {
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
