import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/api/clients/queryClient";
import NavigationTracker from "@/components/NavigationTracker";
import { pagesConfig } from "./pages.config";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import PageNotFound from "./pages/core/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/contexts/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import PriorAuthShell from "./pages/cases/PriorAuthShell";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const PriorAuthPage = Pages["prior-auth"];
const PriorAuthCasePage = Pages["prior-auth-case"];

const PUBLIC_PAGES = ["login", "forgot-password", "reset-password"];
const PERSISTENT_PRIOR_AUTH_PAGES = new Set(["prior-auth", "prior-auth-case"]);

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } =
    useAuth();
  const location = useLocation();

  // Check if current page is public
  const currentPath = location.pathname.replace("/", "");
  const isPublicPage = PUBLIC_PAGES.some((p) => p.toLowerCase() === currentPath.toLowerCase());

  if (isPublicPage) {
    const PublicPage = Pages[currentPath.toLowerCase()] || Pages["login"];
    if (PublicPage) {
      return (
        <Routes>
          <Route path={location.pathname} element={<PublicPage />} />
        </Routes>
      );
    }
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors or unauthenticated users
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  // Render the main app
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        }
      />
      {PriorAuthPage && PriorAuthCasePage ? (
        <Route
          element={
            <LayoutWrapper currentPageName="prior-auth">
              <PriorAuthShell />
            </LayoutWrapper>
          }
        >
          <Route path="/prior-auth" element={<PriorAuthPage embedded />} />
          <Route path="/prior-auth-case" element={<PriorAuthCasePage embedded />} />
        </Route>
      ) : null}
      {Object.entries(Pages).map(([path, Page]) =>
        PERSISTENT_PRIOR_AUTH_PAGES.has(path) ? null : (
          <Route
            key={path}
            path={`/${path}`}
            element={
              PUBLIC_PAGES.includes(path) ? (
                <Page />
              ) : (
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              )
            }
          />
        )
      )}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NavigationTracker />
          <AuthenticatedApp />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
