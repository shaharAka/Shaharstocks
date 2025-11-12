import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation } from "wouter";
import { TrendingUp, ArrowLeft, CheckCircle2, ShieldAlert, Zap, TrendingUpIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPayPal, setShowPayPal] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const response = await apiRequest("POST", "/api/auth/signup", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowPayPal(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (showPayPal && !paypalLoaded) {
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
      if (!clientId) {
        toast({
          title: "Configuration Error",
          description: "PayPal is not configured. Please contact support.",
          variant: "destructive",
        });
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
  }, [showPayPal, paypalLoaded, toast]);

  useEffect(() => {
    if (paypalLoaded && window.paypal) {
      const planId = import.meta.env.VITE_PAYPAL_PLAN_ID;
      if (!planId) {
        toast({
          title: "Configuration Error",
          description: "PayPal plan is not configured. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      window.paypal.Buttons({
        style: {
          shape: 'pill',
          color: 'silver',
          layout: 'vertical',
          label: 'subscribe'
        },
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({
            plan_id: planId
          });
        },
        onApprove: function(data: any, actions: any) {
          toast({
            title: "Subscription successful!",
            description: `Subscription ID: ${data.subscriptionID}. Your account will be activated shortly.`,
          });
          setTimeout(() => {
            setLocation('/login');
          }, 2000);
        },
        onError: function(err: any) {
          toast({
            title: "Subscription failed",
            description: "There was an error processing your subscription. Please try again.",
            variant: "destructive",
          });
        }
      }).render(`#paypal-button-container-${planId}`);
    }
  }, [paypalLoaded, toast, setLocation]);

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  if (showPayPal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <CardTitle className="text-3xl font-bold">Account Created!</CardTitle>
            </div>
            <CardDescription className="text-lg">
              Subscribe to activate your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <TrendingUpIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Professional Stock Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        signal2 provides real-time portfolio tracking, dual-agent AI analysis powered by SEC filings and sector ETF data, and automated trading rules.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Premium Managed Services</h3>
                      <p className="text-sm text-muted-foreground">
                        Get access to insider trading alerts via Telegram, comprehensive backtesting simulations, and multi-user collaboration features.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">About Subscription Charges</h3>
                      <p className="text-sm text-muted-foreground">
                        Subscription fees cover connections to managed premium data services (Alpha Vantage, Finnhub, OpenAI), secure deployment infrastructure, and ongoing platform maintenance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete your subscription to unlock all features
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <div id={`paypal-button-container-${import.meta.env.VITE_PAYPAL_PLAN_ID}`} data-testid="paypal-button-container"></div>
                </div>

                <div className="text-center pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    After completing your subscription, you can log in to access your account.
                  </p>
                  <Button variant="outline" asChild data-testid="button-go-to-login">
                    <Link href="/login">
                      Go to Login
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
        <Card className="md:flex md:flex-col md:justify-center">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold">signal2</CardTitle>
            </div>
            <CardDescription className="text-base">
              Professional stock trading dashboard with AI-powered analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <TrendingUpIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Dual-Agent AI Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Micro agent analyzes SEC filings and fundamentals, macro agent evaluates industry trends using sector ETFs
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Automated Trading & Backtesting</h3>
                  <p className="text-sm text-muted-foreground">
                    Set trigger-based rules, simulate strategies with historical data, track portfolio in real-time
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Insider Trading Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Telegram integration for real-time stock recommendations and insider transaction monitoring
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Start your subscription to access all features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} data-testid="input-confirm-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-accept-terms"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        I accept the{" "}
                        <Link href="/terms" className="text-primary hover:underline" data-testid="link-terms">
                          Terms and Conditions
                        </Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending}
                data-testid="button-signup"
              >
                {signupMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>

          <div className="text-center pt-4 border-t">
            <Button variant="ghost" asChild data-testid="button-back-to-login">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
