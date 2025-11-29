import { useMutation, useQuery } from "@tanstack/react-query";
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
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check if Google OAuth is configured
  const { data: googleConfigured } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/auth/google/configured"],
  });

  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      const response = await fetch("/api/auth/google/url");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize Google Sign-Up");
      }
      
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: "Google Sign-Up Error",
        description: error.message || "Failed to start Google Sign-Up",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

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
    onSuccess: async (data: { success: boolean; message: string; email: string }) => {
      setSignupSuccess(true);
      setUserEmail(data.email);
      toast({
        title: "Account Created!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-verification", {
        email: userEmail,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "A new verification email has been sent to your inbox.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend",
        description: error.message || "Please try again later.",
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

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold mb-2">Check Your Email!</CardTitle>
              <CardDescription className="text-base">
                We've sent a verification link to <strong>{userEmail}</strong>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 bg-muted/50 rounded-lg p-6">
              <div className="space-y-2">
                <h3 className="font-semibold">What's next?</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Check your email inbox for our verification message</li>
                  <li>Click the verification link to activate your account</li>
                  <li>Log in and start your 30-day free trial!</li>
                </ol>
              </div>
              <div className="text-sm text-muted-foreground pt-4 border-t">
                <p className="mb-2">Didn't receive the email?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes for the email to arrive</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => resendVerificationMutation.mutate()}
                disabled={resendVerificationMutation.isPending}
                data-testid="button-resend-verification"
              >
                {resendVerificationMutation.isPending ? "Sending..." : "Resend Verification Email"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/login")}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                      <h3 className="font-semibold mb-1">AI-Powered Stock Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        Access insider trading opportunities from SEC filings with AI scoring, daily briefs for followed stocks, and smart notifications for high-value buy/sell signals.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Trading Tools & Collaboration</h3>
                      <p className="text-sm text-muted-foreground">
                        Create automated trading rules, run backtests with simulation charts, and collaborate with your team through stock comments and interest markers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Managed Data & Infrastructure</h3>
                      <p className="text-sm text-muted-foreground">
                        Subscription includes managed connections to premium data services (Alpha Vantage, Finnhub, OpenAI), secure cloud deployment, and continuous platform updates.
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
                  <h3 className="font-semibold text-sm mb-1">Insider Trading Signals</h3>
                  <p className="text-sm text-muted-foreground">
                    Track SEC insider transactions with dual-agent AI analysis combining fundamental data and sector momentum. Get AI-scored buy/sell recommendations with personalized filters.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Real-Time Portfolio Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor holdings with live P&L tracking, automated price updates, and intelligent notifications for high-value opportunities and position changes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Automated Trading Rules</h3>
                  <p className="text-sm text-muted-foreground">
                    Create trigger-based rules for automated trade execution. Backtest strategies with historical data and visualize performance with simulation charts.
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
              Start your 30-day free trial to access all features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          {googleConfigured?.configured && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                data-testid="button-google-signup"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? "Connecting..." : "Sign up with Google"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or sign up with email
                  </span>
                </div>
              </div>
            </>
          )}

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
