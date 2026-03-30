/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 *
 * Example file structure:
 *
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 *
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AutomationQueue from "./pages/AutomationQueue";
import BillingDashboard from "./pages/BillingDashboard";
import ClientBilling from "./pages/ClientBilling";
import ClientBillingProfile from "./pages/ClientBillingProfile";
import ClientBrandingAdmin from "./pages/ClientBrandingAdmin";
import ClientCaseDetail from "./pages/ClientCaseDetail";
import ClientCases from "./pages/ClientCases";
import ClientDetail from "./pages/ClientDetail";
import ClientKnowledgeBase from "./pages/ClientKnowledgeBase";
import ClientNotifications from "./pages/ClientNotifications";
import ClientPortal from "./pages/ClientPortal";
import ClientReports from "./pages/ClientReports";
import ClientStorageSettings from "./pages/ClientStorageSettings";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import DriveSyncLogs from "./pages/DriveSyncLogs";
import EligibilityDashboard from "./pages/EligibilityDashboard";
import EligibilityHistory from "./pages/EligibilityHistory";
import FAPayroll from "./pages/FAPayroll";
import Login from "./pages/authentication/Login";
import Register from "./pages/authentication/Register";
import AuthCallback from "./pages/authentication/AuthCallback";
import ForgotPassword from "./pages/authentication/ForgotPassword";
import ResetPassword from "./pages/authentication/ResetPassword";
import KnowledgeBaseAnalytics from "./pages/KnowledgeBaseAnalytics";
import NewVerification from "./pages/NewVerification";
import PayerRules from "./pages/PayerRules";
import PricingPackages from "./pages/PricingPackages";
import PriorAuth from "./pages/PriorAuth";
import PriorAuthCase from "./pages/PriorAuthCase";
import Processing from "./pages/Processing";
import ProviderOnboarding from "./pages/ProviderOnboarding";
import ReviewQueue from "./pages/ReviewQueue";
import SAAuditLogs from "./pages/SAAuditLogs";
import SAClients from "./pages/SAClients";
import SADashboard from "./pages/SADashboard";
import SASecuritySettings from "./pages/SASecuritySettings";
import SAUsers from "./pages/SAUsers";
import Settings from "./pages/Settings";
import SpecialistCaseView from "./pages/SpecialistCaseView";
import StaffTracker from "./pages/StaffTracker";
import SupervisorApprovalQueue from "./pages/SupervisorApprovalQueue";
import UnmatchedDocuments from "./pages/UnmatchedDocuments";
import __Layout from "./Layout.jsx";

export const PAGES = {
  "automation-queue": AutomationQueue,
  "billing-dashboard": BillingDashboard,
  "client-billing": ClientBilling,
  "client-billing-profile": ClientBillingProfile,
  "client-branding-admin": ClientBrandingAdmin,
  "client-case-detail": ClientCaseDetail,
  "client-cases": ClientCases,
  "client-detail": ClientDetail,
  "client-knowledge-base": ClientKnowledgeBase,
  "client-notifications": ClientNotifications,
  "client-portal": ClientPortal,
  "client-reports": ClientReports,
  "client-storage-settings": ClientStorageSettings,
  clients: Clients,
  dashboard: Dashboard,
  "drive-sync-logs": DriveSyncLogs,
  "eligibility-dashboard": EligibilityDashboard,
  "eligibility-history": EligibilityHistory,
  "fa-payroll": FAPayroll,
  home: Dashboard,
  login: Login,
  register: Register,
  "auth/callback": AuthCallback,
  "forgot-password": ForgotPassword,
  "reset-password": ResetPassword,
  "knowledge-base-analytics": KnowledgeBaseAnalytics,
  "new-verification": NewVerification,
  "payer-rules": PayerRules,
  "pricing-packages": PricingPackages,
  "prior-auth": PriorAuth,
  "prior-auth-case": PriorAuthCase,
  processing: Processing,
  "provider-onboarding": ProviderOnboarding,
  "review-queue": ReviewQueue,
  "sa-audit-logs": SAAuditLogs,
  "sa-clients": SAClients,
  "sa-dashboard": SADashboard,
  "sa-security-settings": SASecuritySettings,
  "sa-users": SAUsers,
  settings: Settings,
  "specialist-case-view": SpecialistCaseView,
  "staff-tracker": StaffTracker,
  "supervisor-approval-queue": SupervisorApprovalQueue,
  "unmatched-documents": UnmatchedDocuments,
};

export const pagesConfig = {
  mainPage: "dashboard",
  Pages: PAGES,
  Layout: __Layout,
};
