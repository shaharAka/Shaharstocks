import { useMutation } from "@tanstack/react-query";
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
import { useState, useEffect, useRef } from "react";
import signalBackground from "@assets/moving_signal_boomerang_slow.gif";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

// #region agent log
const logDebug = (location: string, message: string, data: any, hypothesisId: string) => {
  const logData = {location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId};
  console.log(`[DEBUG ${hypothesisId}]`, location, message, data);
  fetch('http://127.0.0.1:7243/ingest/9504a544-9592-4c7b-afe6-b49cb5e62f9f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e)=>console.error('Log fetch failed:',e));
};
// #endregion

export default function Login() {
  // #region agent log
  const renderCount = useRef(0);
  renderCount.current += 1;
  logDebug('login.tsx:Login', 'Login component render', { renderCount: renderCount.current, path: window.location.pathname }, 'H5');
  // #endregion
  
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // #region agent log
  useEffect(() => {
    logDebug('login.tsx:Login', 'Login component mounted', { path: window.location.pathname }, 'H5');
    return () => {
      logDebug('login.tsx:Login', 'Login component unmounting', {}, 'H5');
    };
  }, []);
  // #endregion

  // Handle URL error parameters
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const error = params.get("error");
    
    if (error) {
      const errorMessages: Record<string, string> = {
        trial_expired: "Your free trial has expired. Please subscribe to continue.",
        subscription_required: "An active subscription is required to access the dashboard.",
      };
      
      toast({
        title: "Sign In Failed",
        description: errorMessages[error] || "An error occurred during sign-in.",
        variant: "destructive",
      });
      
      // Clear the error from URL
      window.history.replaceState({}, "", "/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Send token to backend
      await handleFirebaseLogin(idToken);
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      let errorMessage = "Failed to sign in with Google";
      
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked. Please allow popups for this site.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      }
      
      toast({
        title: "Google Sign-In Error",
        description: errorMessage,
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleFirebaseLogin = async (idToken: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", { idToken });
      const data = await response.json();
      await handleLoginSuccess(data);
    } catch (error: any) {
      const errorData = error.errorData || { error: error.message || "Login failed" };
      throw new Error(errorData.error || "Login failed");
    }
  };

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLoginSuccess = async (data: any) => {
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
      
      // Update React Query cache directly with user data from login response
      // This ensures the user context is immediately updated without waiting for a refetch
      if (data.user) {
        logDebug('login.tsx:Login', 'Setting user data in React Query cache', { userId: data.user.id, email: data.user.email }, 'H5');
        
        // Set the query data with updatedAt to mark it as fresh
        // This prevents immediate refetch
        queryClient.setQueryData(["/api/auth/current-user"], { user: data.user }, {
          updatedAt: Date.now()
        });
        
        // Set query defaults to prevent refetch for a few seconds
        queryClient.setQueryDefaults(["/api/auth/current-user"], {
          staleTime: 10000, // Consider fresh for 10 seconds
        });
        
        // Verify the data was set correctly
        const cachedData = queryClient.getQueryData(["/api/auth/current-user"]);
        const hasUser = !!(cachedData as any)?.user;
        const cachedUserId = (cachedData as any)?.user?.id;
        logDebug('login.tsx:Login', 'Verified cache update', { 
          hasUser, 
          cachedUserId,
          matches: cachedUserId === data.user.id 
        }, 'H5');
        
        // Check session cookie
        const cookies = document.cookie;
        const hasSessionCookie = cookies.includes('connect.sid');
        logDebug('login.tsx:Login', 'Session cookie check', { 
          hasSessionCookie,
          cookieLength: cookies.length,
          cookiePreview: cookies.substring(0, 100)
        }, 'H5');
      }
      
      // Invalidate dependent queries (like user progress) that depend on user being logged in
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
      
      // Check for redirect parameter in URL
      const params = new URLSearchParams(searchString);
      const redirectTo = params.get("redirect") || "/following";
      
      logDebug('login.tsx:Login', 'Preparing redirect', { redirectTo }, 'H5');
      
      // Store the intended destination in sessionStorage FIRST, before redirecting
      // This ensures AuthenticatedApp can find it when it checks
      sessionStorage.setItem("loginRedirect", redirectTo);
      
      // CRITICAL FIX: Instead of redirecting to / and waiting for AuthenticatedApp,
      // directly redirect to the dashboard since we've already set the user in cache
      // This avoids the intermediate landing page flash
      // Use a small delay to ensure React Query has processed the cache update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Directly redirect to the dashboard - AuthenticatedApp will handle it correctly
      // because the user data is already in the cache
      logDebug('login.tsx:Login', 'Redirecting directly to dashboard', { redirectTo }, 'H5');
    setLocation(redirectTo);
  };

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      try {
        // Sign in with Firebase
        const result = await signInWithEmailAndPassword(auth, data.email, data.password);
        const idToken = await result.user.getIdToken();
        
        // Send token to backend
        const response = await apiRequest("POST", "/api/auth/login", { idToken });
        return await response.json();
      } catch (error: any) {
        let errorMessage = "Login failed";
        
        // Map Firebase error codes to user-friendly messages
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
          errorMessage = "Invalid email or password";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Invalid email address";
        } else if (error.code === "auth/user-disabled") {
          errorMessage = "This account has been disabled";
        } else if (error.code === "auth/too-many-requests") {
          errorMessage = "Too many failed attempts. Please try again later.";
        } else if (error.code === "auth/network-request-failed") {
          errorMessage = "Network error. Please check your connection.";
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        // Check if backend returned specific error
        if (error.errorData) {
          const errorData = error.errorData;
          const loginError: any = new Error(errorData.error || errorMessage);
          loginError.trialExpired = errorData.trialExpired;
          loginError.subscriptionStatus = errorData.subscriptionStatus;
          loginError.emailVerificationRequired = errorData.emailVerificationRequired;
          loginError.email = errorData.email;
          throw loginError;
        }
        
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (data) => {
      await handleLoginSuccess(data);
    },
    onError: (error: any) => {
      if (error.emailVerificationRequired) {
        toast({
          title: "Email Verification Required",
          description: error.message || "Please verify your email before logging in.",
          variant: "destructive",
        });
      } else if (error.trialExpired) {
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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${signalBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-background/85 dark:bg-background/90" />
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6 relative z-10">
        <Card className="md:flex md:flex-col md:justify-center border-0 shadow-none bg-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-10 w-10 text-primary" />
              <CardTitle className="text-4xl font-bold tracking-tight">signal2 [LOGIN PAGE]</CardTitle>
            </div>
            <CardDescription className="text-lg text-foreground/80">
              Find high-conviction trades by following what insiders know
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2.5 flex-shrink-0">
                  <TrendingUpIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Insider Trading Signals</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    SEC insider transactions scored by AI on a 0-100 scale. Filter noise and surface the strongest opportunities.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2.5 flex-shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI Analysis on Your Watchlist</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Follow stocks and get daily AI briefs with updated recommendations. Track positions with P&L.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2.5 flex-shrink-0">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Smart Alerts</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Set rules to get notified when it matters. Never miss a signal change or high-score opportunity.
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
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            data-testid="button-google-signin"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
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
