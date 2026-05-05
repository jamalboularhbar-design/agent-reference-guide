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
import ReadingListsPage from "./pages/ReadingListsPage";
import TOCPage from "./pages/TOCPage";
import BulkImportPage from "./pages/BulkImportPage";
import DocumentTemplates from "./pages/DocumentTemplates";
import SearchAnalytics from "./pages/SearchAnalytics";
import TagsExplorer from "./pages/TagsExplorer";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/docs/:slug"} component={DocumentDetail} />
      <Route path={"/category/:category"} component={CategoryPage} />
      <Route path={"/compare"} component={CompareDocuments} />
      <Route path={"/toc"} component={TOCPage} />
      <Route path={"/lists"} component={ReadingListsPage} />
      <Route path={"/templates"} component={DocumentTemplates} />
      <Route path={"/tags"} component={TagsExplorer} />
      <Route path={"/admin/editor"} component={AdminEditor} />
      <Route path={"/admin/import"} component={BulkImportPage} />
      <Route path={"/admin/analytics"} component={SearchAnalytics} />
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
          {/* Skip to content link for keyboard/screen reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
          >
            Skip to main content
          </a>
          <main id="main-content" role="main">
            <Router />
          </main>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
