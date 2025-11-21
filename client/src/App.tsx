import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Scale, Zap, FileText } from "lucide-react";
import NotFound from "@/pages/not-found";
import Simulator from "@/pages/simulator";
import ComparisonSimulator from "@/pages/comparison";
import SensitivityAnalysis from "@/pages/sensitivity";
import BulkSimulation from "@/pages/bulk-simulation";
import { ResetProvider } from "@/lib/ResetContext";

export function Navigation() {
  const [location] = useLocation();
  
  return (
    <div className="flex justify-center gap-2 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 w-fit mx-auto">
      <Link href="/">
        <Button 
          variant={location === "/" ? "default" : "ghost"} 
          size="sm"
          className="gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Simülatör
        </Button>
      </Link>
      <Link href="/comparison">
        <Button 
          variant={location === "/comparison" ? "default" : "ghost"} 
          size="sm"
          className="gap-2"
        >
          <Scale className="w-4 h-4" />
          Kıyaslama
        </Button>
      </Link>
      <Link href="/sensitivity">
        <Button 
          variant={location === "/sensitivity" ? "default" : "ghost"} 
          size="sm"
          className="gap-2"
        >
          <Zap className="w-4 h-4" />
          Hassasiyet
        </Button>
      </Link>
      <Link href="/bulk">
        <Button 
          variant={location === "/bulk" ? "default" : "ghost"} 
          size="sm"
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Toplu Simülasyon
        </Button>
      </Link>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Simulator} />
      <Route path="/comparison" component={ComparisonSimulator} />
      <Route path="/sensitivity" component={SensitivityAnalysis} />
      <Route path="/bulk" component={BulkSimulation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ResetProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ResetProvider>
    </QueryClientProvider>
  );
}

export default App;
