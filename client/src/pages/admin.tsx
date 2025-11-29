import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { format } from "date-fns";
import { ShieldCheck, Users, Activity, DollarSign, MoreVertical, Trash2, Archive, ArchiveRestore, Key, Calendar, Receipt, Plus, Ban, CheckCircle, Gift, Pencil, Settings } from "lucide-react";
import { useState } from "react";
import type { Announcement } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminNotificationBell } from "@/components/admin-notification-bell";

interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  isAdmin: boolean;
  subscriptionStatus: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  paypalSubscriptionId?: string;
  createdAt: string;
  archived: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface Payment {
  id: string;
  userId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  transactionId?: string;
  notes?: string;
  createdBy?: string;
}

interface PaymentStats {
  totalPaid: string;
  lastPaymentDate: Date | null;
  lastPaymentAmount: string | null;
  paymentCount: number;
}

interface ManualOverride {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  monthsExtended: number;
  reason?: string;
  createdAt: string;
  createdBy: string;
}

export default function AdminPage() {
  const { user: currentUser, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  
  const [adminSecret, setAdminSecret] = useState<string>(() => {
    return sessionStorage.getItem("adminSecret") || "";
  });
  const [showSecretDialog, setShowSecretDialog] = useState(!adminSecret);
  const [secretInput, setSecretInput] = useState("");
  
  const [showArchived, setShowArchived] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [createPaymentDialogOpen, setCreatePaymentDialogOpen] = useState(false);
  const [viewPaymentsDialogOpen, setViewPaymentsDialogOpen] = useState(false);
  const [createAnnouncementDialogOpen, setCreateAnnouncementDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [extendMonths, setExtendMonths] = useState("1");
  const [extendReason, setExtendReason] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [paymentNotes, setPaymentNotes] = useState("");
  
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementType, setAnnouncementType] = useState<"feature" | "update" | "maintenance" | "announcement">("announcement");
  
  const [versionInput, setVersionInput] = useState("");
  const [releaseNotesInput, setReleaseNotesInput] = useState("");

  const handleSetAdminSecret = () => {
    if (secretInput) {
      setAdminSecret(secretInput);
      sessionStorage.setItem("adminSecret", secretInput);
      setShowSecretDialog(false);
      setSecretInput("");
    }
  };

  const handleClearAdminSecret = () => {
    setAdminSecret("");
    sessionStorage.removeItem("adminSecret");
    setShowSecretDialog(true);
  };

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users", showArchived],
    enabled: !!currentUser?.isAdmin,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showArchived) {
        params.append("includeArchived", "true");
      }
      const url = `/api/users${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      
      return res.json();
    },
  });

  const { data: paymentsData } = useQuery<{
    user: User;
    payments: Payment[];
    stats: PaymentStats;
    overrides: ManualOverride[];
  }>({
    queryKey: ["/api/admin/user-payments", selectedUser?.id],
    enabled: viewPaymentsDialogOpen && !!selectedUser && !!adminSecret,
    queryFn: async () => {
      const res = await fetch(`/api/admin/user-payments/${selectedUser!.id}`, {
        headers: {
          "x-admin-secret": adminSecret,
        },
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch payments");
      }
      
      return res.json();
    },
  });

  const adminActionMutation = useMutation({
    mutationFn: async ({ endpoint, email, body }: { endpoint: string; email: string; body?: any }) => {
      if (!adminSecret) {
        throw new Error("Admin secret not set");
      }
      
      const res = await fetch(endpoint, {
        method: endpoint.includes("delete-user") ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ email, ...body }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Action failed");
      }
      
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      const action = variables.endpoint.split("/").pop();
      toast({
        title: "Success",
        description: `${action} completed successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activateSubscriptionMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!adminSecret) {
        throw new Error("Admin secret not set");
      }
      
      const res = await fetch("/api/admin/activate-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to activate subscription");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Subscription activated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate subscription",
        variant: "destructive",
      });
    },
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!adminSecret) {
        throw new Error("Admin secret not set");
      }
      
      const res = await fetch("/api/admin/create-super-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to promote user");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User promoted to admin successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to promote user",
        variant: "destructive",
      });
    },
  });

  const handleExtendSubscription = () => {
    if (!selectedUser) return;
    
    adminActionMutation.mutate({
      endpoint: "/api/admin/extend-subscription",
      email: selectedUser.email,
      body: {
        months: parseInt(extendMonths),
        reason: extendReason,
      },
    }, {
      onSuccess: () => {
        setExtendDialogOpen(false);
        setExtendMonths("1");
        setExtendReason("");
        setSelectedUser(null);
      },
    });
  };

  const handleResetPassword = () => {
    if (!selectedUser || !newPassword) return;
    
    adminActionMutation.mutate({
      endpoint: "/api/admin/reset-password",
      email: selectedUser.email,
      body: { newPassword },
    }, {
      onSuccess: () => {
        setResetPasswordDialogOpen(false);
        setNewPassword("");
        setSelectedUser(null);
      },
    });
  };

  const handleCreatePayment = () => {
    if (!selectedUser || !paymentAmount) return;
    
    adminActionMutation.mutate({
      endpoint: "/api/admin/create-payment",
      email: selectedUser.email,
      body: {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        notes: paymentNotes,
      },
    }, {
      onSuccess: () => {
        setCreatePaymentDialogOpen(false);
        setPaymentAmount("");
        setPaymentMethod("manual");
        setPaymentNotes("");
        setSelectedUser(null);
      },
    });
  };

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements/all"],
    enabled: !!currentUser?.isAdmin,
  });

  // Version management
  interface VersionInfo {
    version: string;
    name: string;
    releaseNotes: string | null;
    updatedAt: string | null;
  }
  
  const { data: versionInfo } = useQuery<VersionInfo>({
    queryKey: ["/api/version"],
    enabled: !!currentUser?.isAdmin,
  });

  const updateVersionMutation = useMutation({
    mutationFn: async ({ appVersion, releaseNotes }: { appVersion: string; releaseNotes: string }) => {
      const res = await fetch("/api/admin/version", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ appVersion, releaseNotes }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update version");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/version"] });
      toast({
        title: "Success",
        description: "App version updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: announcementTitle,
          content: announcementContent,
          type: announcementType,
        }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create announcement");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setCreateAnnouncementDialogOpen(false);
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementType("announcement");
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deactivateAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const res = await fetch(`/api/announcements/${announcementId}/deactivate`, {
        method: "PATCH",
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to deactivate announcement");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "Success",
        description: "Announcement deactivated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title: string; content: string; type: string } }) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update announcement");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setEditingAnnouncement(null);
      setCreateAnnouncementDialogOpen(false);
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementType("announcement");
      toast({
        title: "Success",
        description: "Announcement updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const res = await fetch(`/api/announcements/${announcementId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete announcement");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAnnouncementActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle announcement status");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAnnouncement = () => {
    if (!announcementTitle || !announcementContent) return;
    createAnnouncementMutation.mutate();
  };

  const handleEditAnnouncement = () => {
    if (!editingAnnouncement) return;
    editAnnouncementMutation.mutate({
      id: editingAnnouncement.id,
      data: {
        title: announcementTitle,
        content: announcementContent,
        type: announcementType,
      },
    });
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementTitle(announcement.title);
    setAnnouncementContent(announcement.content);
    setAnnouncementType(announcement.type as "feature" | "update" | "maintenance" | "announcement");
    setCreateAnnouncementDialogOpen(true);
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!currentUser?.isAdmin) {
    return <Redirect to="/" />;
  }

  const filteredUsers = showArchived 
    ? users 
    : users?.filter(u => !u.archived);
  const activeUsers = users?.filter(u => u.subscriptionStatus === "active" && !u.archived).length || 0;
  const inactiveUsers = users?.filter(u => u.subscriptionStatus === "inactive" && !u.archived).length || 0;
  const adminUsers = users?.filter(u => u.isAdmin && !u.archived).length || 0;
  const archivedCount = users?.filter(u => u.archived).length || 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-title">
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive user management, subscriptions, and payment tracking
          </p>
        </div>
        {currentUser?.isSuperAdmin && (
          <div className="flex items-center gap-2">
            <AdminNotificationBell />
          </div>
        )}
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-user-management">
            <Users className="w-4 h-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="announcements" data-testid="tab-announcements">
            <Gift className="w-4 h-4 mr-2" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {(users?.length || 0) - archivedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {archivedCount} archived
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-active-subscriptions">
              {activeUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-inactive-users">
              {inactiveUsers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-admin-count">
              {adminUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              data-testid="button-toggle-archived"
            >
              {showArchived ? "Hide Archived" : `Show Archived (${archivedCount})`}
            </Button>
            {adminSecret && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAdminSecret}
                data-testid="button-clear-secret"
              >
                <Key className="w-4 h-4 mr-1" />
                Clear Secret
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <div className="space-y-4">
              {filteredUsers?.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 border rounded-lg hover-elevate ${user.archived ? 'opacity-60' : ''}`}
                  data-testid={`row-user-${user.id}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar>
                      <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium truncate" data-testid={`text-name-${user.id}`}>
                          {user.name}
                        </p>
                        {user.isAdmin && (
                          <Badge variant="secondary" className="shrink-0">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.archived && (
                          <Badge variant="destructive" className="shrink-0">
                            <Archive className="w-3 h-3 mr-1" />
                            Archived
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-email-${user.id}`}>
                        {user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant={
                            user.subscriptionStatus === "active"
                              ? "default"
                              : user.subscriptionStatus === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.subscriptionStatus}
                        </Badge>
                        {user.subscriptionStartDate && (
                          <span className="text-xs text-muted-foreground">
                            Started: {format(new Date(user.subscriptionStartDate), "MMM d, yyyy")}
                          </span>
                        )}
                        {user.subscriptionEndDate && (
                          <span className="text-xs text-muted-foreground">
                            Ends: {format(new Date(user.subscriptionEndDate), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {user.subscriptionStatus !== "active" && !user.archived && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateSubscriptionMutation.mutate(user.email)}
                        disabled={activateSubscriptionMutation.isPending}
                        data-testid={`button-activate-${user.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-menu-${user.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {!user.isAdmin && (
                          <DropdownMenuItem
                            onClick={() => promoteToAdminMutation.mutate(user.email)}
                            data-testid={`menu-promote-${user.id}`}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        
                        {user.subscriptionStatus === "active" && !user.archived && (
                          <DropdownMenuItem
                            onClick={() => adminActionMutation.mutate({
                              endpoint: "/api/admin/deactivate-subscription",
                              email: user.email,
                            })}
                            data-testid={`menu-deactivate-${user.id}`}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Deactivate Subscription
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setExtendDialogOpen(true);
                          }}
                          data-testid={`menu-extend-${user.id}`}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Extend Subscription
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setResetPasswordDialogOpen(true);
                          }}
                          data-testid={`menu-reset-password-${user.id}`}
                        >
                          <Key className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setViewPaymentsDialogOpen(true);
                          }}
                          data-testid={`menu-view-payments-${user.id}`}
                        >
                          <Receipt className="mr-2 h-4 w-4" />
                          View Payments
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setCreatePaymentDialogOpen(true);
                          }}
                          data-testid={`menu-create-payment-${user.id}`}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Payment
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {!user.archived ? (
                          <DropdownMenuItem
                            onClick={() => adminActionMutation.mutate({
                              endpoint: "/api/admin/archive-user",
                              email: user.email,
                            })}
                            data-testid={`menu-archive-${user.id}`}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => adminActionMutation.mutate({
                              endpoint: "/api/admin/unarchive-user",
                              email: user.email,
                            })}
                            data-testid={`menu-unarchive-${user.id}`}
                          >
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Unarchive User
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Are you sure you want to permanently delete ${user.name}? This cannot be undone.`)) {
                              adminActionMutation.mutate({
                                endpoint: "/api/admin/delete-user",
                                email: user.email,
                              });
                            }
                          }}
                          className="text-destructive"
                          data-testid={`menu-delete-${user.id}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {filteredUsers?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No users found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Announcements</CardTitle>
              <Button
                onClick={() => setCreateAnnouncementDialogOpen(true)}
                data-testid="button-create-announcement"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Announcement
              </Button>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No announcements yet. Create one to notify all users.
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="flex items-start justify-between gap-4 p-4 border rounded-lg hover-elevate"
                      data-testid={`announcement-${announcement.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{announcement.title}</span>
                          <Badge variant={
                            announcement.type === "feature" ? "default" :
                            announcement.type === "update" ? "secondary" :
                            announcement.type === "maintenance" ? "destructive" :
                            "outline"
                          } className="capitalize">
                            {announcement.type}
                          </Badge>
                          <Badge variant={announcement.isActive ? "default" : "outline"}>
                            {announcement.isActive ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(announcement.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${announcement.id}`} className="text-xs text-muted-foreground">
                            {announcement.isActive ? "Active" : "Inactive"}
                          </Label>
                          <Switch
                            id={`active-${announcement.id}`}
                            checked={announcement.isActive}
                            onCheckedChange={(checked) => 
                              toggleAnnouncementActiveMutation.mutate({ id: announcement.id, isActive: checked })
                            }
                            disabled={toggleAnnouncementActiveMutation.isPending}
                            data-testid={`switch-active-${announcement.id}`}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(announcement)}
                          data-testid={`button-edit-${announcement.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {currentUser?.isSuperAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                            disabled={deleteAnnouncementMutation.isPending}
                            data-testid={`button-delete-${announcement.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>App Version</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Current Version:</span>
                  <Badge variant="outline" className="font-mono" data-testid="text-current-version">
                    {versionInfo?.version || "1.0.0"}
                  </Badge>
                </div>
                {versionInfo?.releaseNotes && (
                  <p className="text-sm text-muted-foreground">
                    {versionInfo.releaseNotes}
                  </p>
                )}
                {versionInfo?.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {format(new Date(versionInfo.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="version">New Version</Label>
                  <Input
                    id="version"
                    placeholder="e.g., 1.2.0"
                    value={versionInput}
                    onChange={(e) => setVersionInput(e.target.value)}
                    data-testid="input-version"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="releaseNotes">Release Notes (Optional)</Label>
                  <Textarea
                    id="releaseNotes"
                    placeholder="What's new in this version?"
                    value={releaseNotesInput}
                    onChange={(e) => setReleaseNotesInput(e.target.value)}
                    data-testid="input-release-notes"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!versionInput.trim()) {
                      toast({
                        title: "Error",
                        description: "Please enter a version number",
                        variant: "destructive",
                      });
                      return;
                    }
                    updateVersionMutation.mutate({
                      appVersion: versionInput.trim(),
                      releaseNotes: releaseNotesInput.trim(),
                    });
                    setVersionInput("");
                    setReleaseNotesInput("");
                  }}
                  disabled={updateVersionMutation.isPending || !versionInput.trim()}
                  data-testid="button-update-version"
                >
                  {updateVersionMutation.isPending ? "Updating..." : "Update Version"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription>
              Manually extend subscription for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="months">Number of Months</Label>
              <Input
                id="months"
                type="number"
                min="1"
                max="120"
                value={extendMonths}
                onChange={(e) => setExtendMonths(e.target.value)}
                data-testid="input-extend-months"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why are you extending this subscription?"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                data-testid="input-extend-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendSubscription} data-testid="button-confirm-extend">
              Extend Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={newPassword.length < 8} data-testid="button-confirm-reset">
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createPaymentDialogOpen} onOpenChange={setCreatePaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Manual Payment</DialogTitle>
            <DialogDescription>
              Record a manual payment for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                data-testid="input-payment-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this payment"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                data-testid="input-payment-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayment} disabled={!paymentAmount} data-testid="button-confirm-payment">
              Create Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewPaymentsDialogOpen} onOpenChange={setViewPaymentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment History - {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Complete payment and subscription history
            </DialogDescription>
          </DialogHeader>
          
          {paymentsData && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${parseFloat(paymentsData.stats.totalPaid).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Last Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {paymentsData.stats.lastPaymentAmount ? `$${parseFloat(paymentsData.stats.lastPaymentAmount).toFixed(2)}` : 'N/A'}
                    </div>
                    {paymentsData.stats.lastPaymentDate && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(paymentsData.stats.lastPaymentDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Payment Count</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {paymentsData.stats.paymentCount}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Manual Extensions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {paymentsData.overrides.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Payment History</h3>
                {paymentsData.payments.length > 0 ? (
                  <div className="space-y-2">
                    {paymentsData.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            ${parseFloat(payment.amount).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(payment.paymentDate), "MMM d, yyyy")} • {payment.paymentMethod}
                          </div>
                          {payment.notes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {payment.notes}
                            </div>
                          )}
                        </div>
                        <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments recorded
                  </div>
                )}
              </div>

              {paymentsData.overrides.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Manual Subscription Extensions</h3>
                  <div className="space-y-2">
                    {paymentsData.overrides.map((override) => (
                      <div
                        key={override.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {override.monthsExtended} month{override.monthsExtended !== 1 ? 's' : ''} extension
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(override.startDate), "MMM d, yyyy")} - {format(new Date(override.endDate), "MMM d, yyyy")}
                          </div>
                          {override.reason && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {override.reason}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary">Manual Override</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createAnnouncementDialogOpen} onOpenChange={(open) => {
        setCreateAnnouncementDialogOpen(open);
        if (!open) {
          setEditingAnnouncement(null);
          setAnnouncementTitle("");
          setAnnouncementContent("");
          setAnnouncementType("announcement");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
            <DialogDescription>
              {editingAnnouncement 
                ? "Update the announcement details" 
                : "Create a new announcement that will be visible to all users"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="announcementTitle">Title</Label>
              <Input
                id="announcementTitle"
                placeholder="Announcement title"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                data-testid="input-announcement-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcementContent">Content</Label>
              <Textarea
                id="announcementContent"
                placeholder="Announcement message"
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                data-testid="input-announcement-content"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcementType">Type</Label>
              <Select value={announcementType} onValueChange={(value: any) => setAnnouncementType(value)}>
                <SelectTrigger data-testid="select-announcement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateAnnouncementDialogOpen(false);
              setEditingAnnouncement(null);
              setAnnouncementTitle("");
              setAnnouncementContent("");
              setAnnouncementType("announcement");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingAnnouncement ? handleEditAnnouncement : handleCreateAnnouncement} 
              disabled={!announcementTitle || !announcementContent || (editingAnnouncement ? editAnnouncementMutation.isPending : createAnnouncementMutation.isPending)}
              data-testid="button-confirm-announcement"
            >
              {editingAnnouncement ? "Update Announcement" : "Create Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Secret Required</DialogTitle>
            <DialogDescription>
              Enter your admin secret to access admin features. This will be stored securely in your session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminSecret">Admin Secret</Label>
              <Input
                id="adminSecret"
                type="password"
                placeholder="Enter admin secret"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && secretInput) {
                    handleSetAdminSecret();
                  }
                }}
                data-testid="input-admin-secret"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSetAdminSecret} disabled={!secretInput} data-testid="button-set-secret">
              Set Admin Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
