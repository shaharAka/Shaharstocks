import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { TrendingUp, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
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
      const script = document.createElement('script');
      script.src = 'https://www.paypal.com/sdk/js?client-id=AbxvMnD49CFQ1OmupMzmhtkXTM9OG5NI-VJ7Sff5dRiw8qM1Sb_4Ac4gVoXLB8Z8MSgnJefZJaaOmHMc&vault=true&intent=subscription';
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
  }, [showPayPal, paypalLoaded]);

  useEffect(() => {
    if (paypalLoaded && window.paypal) {
      window.paypal.Buttons({
        style: {
          shape: 'pill',
          color: 'silver',
          layout: 'vertical',
          label: 'subscribe'
        },
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({
            plan_id: 'P-7MD97450VP279543SNEHWHRI'
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
      }).render('#paypal-button-container-P-7MD97450VP279543SNEHWHRI');
    }
  }, [paypalLoaded, toast, setLocation]);

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  if (showPayPal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <CardTitle className="text-3xl font-bold">Account Created!</CardTitle>
            </div>
            <CardDescription className="text-lg">
              Subscribe to activate your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Your account has been created successfully. To access TradePro, please complete your subscription.
                </p>
              </div>
              
              <div className="flex justify-center">
                <div id="paypal-button-container-P-7MD97450VP279543SNEHWHRI" data-testid="paypal-button-container"></div>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">TradePro</CardTitle>
          </div>
          <CardDescription className="text-lg">
            Create your account
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
  );
}
