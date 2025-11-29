import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link, useLocation, useSearch } from "wouter";
import { Activity, AlertCircle, TrendingUpIcon, Zap, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SiGoogle } from "react-icons/si";
import { useState, useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check if Google OAuth is configured
  const { data: googleConfigured } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/auth/google/configured"],
  });

  // Handle URL error parameters from Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const error = params.get("error");
    
    if (error) {
      const errorMessages: Record<string, string> = {
        google_auth_failed: "Google sign-in failed. Please try again.",
        missing_code: "Authentication was cancelled. Please try again.",
        invalid_state: "Security check failed. Please try again.",
        trial_expired: "Your free trial has expired. Please subscribe to continue.",
        subscription_required: "An active subscription is required to access the dashboard.",
        session_error: "Session error. Please try again.",
      };
      
      toast({
        title: "Sign In Failed",
        description: errorMessages[error] || "An error occurred during sign-in.",
        variant: "destructive",
      });
      
      // Clear the error from URL
      window.history.replaceState({}, "", "/login");
    }
  }, [searchString, toast]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const response = await fetch("/api/auth/google/url");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize Google Sign-In");
      }
      
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: "Google Sign-In Error",
        description: error.message || "Failed to start Google Sign-In",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(errorData.error || "Login failed");
        error.trialExpired = errorData.trialExpired;
        error.subscriptionStatus = errorData.subscriptionStatus;
        error.emailVerificationRequired = errorData.emailVerificationRequired;
        error.email = errorData.email;
        throw error;
      }
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.subscriptionStatus === "inactive") {
        toast({
          title: "Subscription Required",
          description: "Please subscribe to access your account.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Welcome back!",
        description: data.subscriptionStatus === "trial" 
          ? "Enjoy your free trial!"
          : "You have successfully logged in.",
      });
      
      // CRITICAL FIX: Force full page reload to prevent cross-user data contamination
      // This ensures all React Query cache, component state, and ongoing queries are cleared
      window.location.href = "/";
    },
    onError: (error: any) => {
      if (error.emailVerificationRequired) {
        // Show special message for unverified emails
        toast({
          title: "Email Verification Required",
          description: error.message || "Please verify your email before logging in.",
          variant: "destructive",
        });
      } else if (error.trialExpired) {
        // Show special message for expired trials
        toast({
          title: "Free Trial Expired",
          description: "Your 30-day trial has ended. Subscribe now to continue using signal2.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login failed",
          description: error.message || "Invalid email or password.",
          variant: "destructive",
        });
      }
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/resend-verification", { email });
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

  const onSubmit = (data: LoginForm) => {
    console.log('Login form submitted:', { email: data.email });
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
        <Card className="md:flex md:flex-col md:justify-center">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-8 w-8 text-primary" />
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
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Access your trading dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          {googleConfigured?.configured && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                data-testid="button-google-signin"
              >
                <SiGoogle className="h-4 w-4" />
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="john@example.com" 
                        {...field} 
                        data-testid="input-email" 
                        autoComplete="email"
                      />
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
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        data-testid="input-password"
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full touch-manipulation"
                disabled={loginMutation.isPending}
                data-testid="button-login"
                onClick={(e) => {
                  console.log('Login button clicked');
                  const formElement = e.currentTarget.closest('form');
                  if (!formElement) {
                    console.error('Form element not found');
                  }
                }}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              New users get a 30-day free trial. An active subscription is required after trial expires.
            </AlertDescription>
          </Alert>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Don't have an account?
            </p>
            <Button variant="outline" asChild data-testid="button-create-account">
              <Link href="/signup">Create New Account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
