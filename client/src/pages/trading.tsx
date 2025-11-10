import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Rules from "./rules";
import Simulation from "./simulation";

export default function Trading() {
  const [activeTab, setActiveTab] = useState("rules");

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">
          Trading
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure automated trading rules and run backtesting simulations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList data-testid="tabs-trading">
          <TabsTrigger value="rules" data-testid="tab-rules">Trading Rules</TabsTrigger>
          <TabsTrigger value="simulation" data-testid="tab-simulation">Backtesting</TabsTrigger>
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
