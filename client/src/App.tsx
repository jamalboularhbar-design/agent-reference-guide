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
import SearchResultsPage from "./pages/SearchResultsPage";
import EmbedDocument from "./pages/EmbedDocument";
import AdminActivityPage from "./pages/AdminActivityPage";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage";
import AdminCategoriesPage from "./pages/AdminCategoriesPage";
import AdminStaleDocsPage from "./pages/AdminStaleDocsPage";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import AnnouncementBanner from "./components/AnnouncementBanner";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import GlossaryPage from "./pages/GlossaryPage";
import TemplatesGalleryPage from "./pages/TemplatesGalleryPage";
import ReadingGoalsPage from "./pages/ReadingGoalsPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import AdminKanbanPage from "./pages/AdminKanbanPage";
import AdminAuditTrailPage from "./pages/AdminAuditTrailPage";
import AdminApprovalsPage from "./pages/AdminApprovalsPage";
import AdminTagsPage from "./pages/AdminTagsPage";
import AdminImportUrlPage from "./pages/AdminImportUrlPage";
import AdminScheduledPage from "./pages/AdminScheduledPage";
import BookmarksPage from "./pages/BookmarksPage";
import ShareLinkPage from "./pages/ShareLinkPage";
import OnboardingTour from "./components/OnboardingTour";
import AdminBrandingPage from "./pages/AdminBrandingPage";
import AdminWebhooksPage from "./pages/AdminWebhooksPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminVisitorAnalyticsPage from "./pages/AdminVisitorAnalyticsPage";
import AdminArchivePage from "./pages/AdminArchivePage";
import AdminCategoryOrderPage from "./pages/AdminCategoryOrderPage";
import ReadingHistoryPage from "./pages/ReadingHistoryPage";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";
import AdminDuplicatePage from "./pages/AdminDuplicatePage";
import AdminBulkExportPage from "./pages/AdminBulkExportPage";

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
      <Route path={"/search"} component={SearchResultsPage} />
      <Route path={"/embed/:slug"} component={EmbedDocument} />
      <Route path={"/admin/editor"} component={AdminEditor} />
      <Route path={"/admin/import"} component={BulkImportPage} />
      <Route path={"/admin/analytics"} component={SearchAnalytics} />
      <Route path={"/admin/activity"} component={AdminActivityPage} />
      <Route path={"/admin/announcements"} component={AdminAnnouncementsPage} />
      <Route path={"/admin/categories"} component={AdminCategoriesPage} />
      <Route path={"/admin/stale"} component={AdminStaleDocsPage} />
      <Route path={"/admin/dashboard"} component={AdminDashboardPage} />
      <Route path={"/glossary"} component={GlossaryPage} />
      <Route path={"/templates/gallery"} component={TemplatesGalleryPage} />
      <Route path={"/reading-goals"} component={ReadingGoalsPage} />
      <Route path={"/api/docs"} component={ApiDocsPage} />
      <Route path={"/admin/kanban"} component={AdminKanbanPage} />
      <Route path={"/admin/audit"} component={AdminAuditTrailPage} />
      <Route path={"/admin/approvals"} component={AdminApprovalsPage} />
      <Route path={"/admin/tags"} component={AdminTagsPage} />
      <Route path={"/admin/import-url"} component={AdminImportUrlPage} />
      <Route path={"/admin/scheduled"} component={AdminScheduledPage} />
      <Route path={"/bookmarks"} component={BookmarksPage} />
      <Route path={"/share/:token"} component={ShareLinkPage} />
      <Route path={"/admin/branding"} component={AdminBrandingPage} />
      <Route path={"/admin/webhooks"} component={AdminWebhooksPage} />
      <Route path={"/admin/users"} component={AdminUsersPage} />
      <Route path={"/admin/visitors"} component={AdminVisitorAnalyticsPage} />
      <Route path={"/admin/archive"} component={AdminArchivePage} />
      <Route path={"/admin/category-order"} component={AdminCategoryOrderPage} />
      <Route path={"/admin/feedback"} component={AdminFeedbackPage} />
      <Route path={"/admin/duplicate"} component={AdminDuplicatePage} />
      <Route path={"/admin/bulk-export"} component={AdminBulkExportPage} />
      <Route path={"/reading-history"} component={ReadingHistoryPage} />
      <Route path={"/history"} component={ReadingHistoryPage} />
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
          {/* Site-wide announcement banner */}
          <AnnouncementBanner />
          <OnboardingTour />
          <main id="main-content" role="main">
            <Router />
          </main>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
