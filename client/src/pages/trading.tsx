import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Rules from "./rules";
import Simulation from "./simulation";

export default function Trading() {
  const [, setLocation] = useLocation();
  
  // Read tab from URL query parameter
  const searchParams = new URLSearchParams(window.location.search);
  const tabFromUrl = searchParams.get('tab') || 'rules';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  // Listen to custom URL change events and popstate
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'rules';
      setActiveTab(tab);
    };
    
    // Listen to popstate (browser back/forward)
    window.addEventListener('popstate', handleUrlChange);
    // Listen to custom event for programmatic navigation
    window.addEventListener('urlchange', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('urlchange', handleUrlChange);
    };
  }, []);
  
  // Update URL when tab changes via UI
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setLocation(`/trading?tab=${newTab}`);
    // Dispatch custom event for other components
    window.dispatchEvent(new Event('urlchange'));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold whitespace-nowrap" data-testid="text-page-title">
          Trading
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
        <TabsList className="w-full grid grid-cols-2" data-testid="tabs-trading">
          <TabsTrigger value="rules" data-testid="tab-rules" title="Create automated rules to trigger actions based on stock price changes">
            Trading Rules
          </TabsTrigger>
          <TabsTrigger value="simulation" data-testid="tab-simulation" title="Simulate how your holdings would perform using historical price data">
            Backtesting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" forceMount hidden={activeTab !== "rules"}>
          <Rules />
        </TabsContent>

        <TabsContent value="simulation" forceMount hidden={activeTab !== "simulation"}>
          <Simulation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
