import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Scale } from "lucide-react";
import NotFound from "@/pages/not-found";
import Simulator from "@/pages/simulator";
import ComparisonSimulator from "@/pages/comparison";

function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="fixed top-4 right-4 z-50 flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-slate-200">
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
    </nav>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={Simulator} />
        <Route path="/comparison" component={ComparisonSimulator} />
        <Route component={NotFound} />
      </Switch>
    </>
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
