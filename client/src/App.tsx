import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DocumentDetail from "./pages/DocumentDetail";
import AdminEditor from "./pages/AdminEditor";
import CategoryPage from "./pages/CategoryPage";
import CompareDocuments from "./pages/CompareDocuments";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/docs/:slug"} component={DocumentDetail} />
      <Route path={"/category/:category"} component={CategoryPage} />
      <Route path={"/compare"} component={CompareDocuments} />
      <Route path={"/admin/editor"} component={AdminEditor} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable={true}
      >
        <TooltipProvider>
          <Toaster />
          <KeyboardShortcutsModal />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
