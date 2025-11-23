import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Scale, Zap, FileText, RotateCcw } from "lucide-react";
import NotFound from "@/pages/not-found";
import Simulator from "@/pages/simulator";
import ComparisonSimulator from "@/pages/comparison";
import SensitivityAnalysis from "@/pages/sensitivity";
import BulkSimulation from "@/pages/bulk-simulation";

export function Navigation() {
  const [location] = useLocation();

  const handleResetAll = () => {
    localStorage.removeItem('simulator_form_data');
    localStorage.removeItem('comparison_scenario1_data');
    localStorage.removeItem('comparison_scenario2_data');
    localStorage.removeItem('comparison_hedefKarTL');
    localStorage.removeItem('sensitivity_base_data');
    localStorage.removeItem('bulk_simulation_products');
    localStorage.removeItem('bulk_simulation_results');
    localStorage.removeItem('bulk_simulation_fixed_expenses');
    localStorage.removeItem('bulk_simulation_variable_expenses');
    const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    window.location.reload();
  };
  
  return (
    <div className="flex justify-center gap-2 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 w-fit mx-auto flex-wrap">
      <Link href="/">
        <Button 
          variant={location === "/" ? "default" : "ghost"} 
          size="sm"
          className="gap-2"
          data-testid="nav-simulator"
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
          data-testid="nav-comparison"
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
          data-testid="nav-sensitivity"
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
          data-testid="nav-bulk"
        >
          <FileText className="w-4 h-4" />
          Toplu Simülasyon
        </Button>
      </Link>
      <Button 
        variant="outline" 
        size="sm"
        className="gap-2 text-slate-600 hover:text-slate-900"
        onClick={handleResetAll}
        data-testid="button-reset-all"
      >
        <RotateCcw className="w-4 h-4" />
        Varsayılana Sıfırla
      </Button>
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
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
