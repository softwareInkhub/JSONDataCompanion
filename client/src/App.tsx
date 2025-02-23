import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Preview from "@/pages/preview";
import Schemas from "@/pages/schemas";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/test" component={Home} />
      <Route path="/preview/:id" component={Preview} />
      <Route path="/schemas" component={Schemas} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;