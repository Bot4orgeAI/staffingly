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
import AutomationQueue from "./pages/cases/AutomationQueue";
import BillingDashboard from "./pages/finance/BillingDashboard";
import ClientBilling from "./pages/clients/ClientBilling";
import ClientBillingProfile from "./pages/clients/ClientBillingProfile";
import ClientBrandingAdmin from "./pages/clients/ClientBrandingAdmin";
import ClientCaseDetail from "./pages/clients/ClientCaseDetail";
import ClientCases from "./pages/clients/ClientCases";
import ClientDetail from "./pages/clients/ClientDetail";
import ClientKnowledgeBase from "./pages/clients/ClientKnowledgeBase";
import ClientNotifications from "./pages/clients/ClientNotifications";
import ClientPortal from "./pages/clients/ClientPortal";
import ClientReports from "./pages/clients/ClientReports";
import ClientStorageSettings from "./pages/clients/ClientStorageSettings";
import Clients from "./pages/clients/Clients";
import Dashboard from "./pages/core/Dashboard";
import DriveSyncLogs from "./pages/system/DriveSyncLogs";
import EligibilityDashboard from "./pages/eligibility/EligibilityDashboard";
import EligibilityHistory from "./pages/eligibility/EligibilityHistory";
import FAPayroll from "./pages/finance/FAPayroll";
import Login from "./pages/authentication/Login";
import ForgotPassword from "./pages/authentication/ForgotPassword";
import ResetPassword from "./pages/authentication/ResetPassword";
import KnowledgeBaseAnalytics from "./pages/system/KnowledgeBaseAnalytics";
import NewVerification from "./pages/eligibility/NewVerification";
import Patients from "./pages/clinical/Patients";
import PayerRules from "./pages/system/PayerRules";
import PricingPackages from "./pages/finance/PricingPackages";
import PriorAuth from "./pages/cases/PriorAuth";
import PriorAuthCase from "./pages/cases/PriorAuthCase";
import Processing from "./pages/eligibility/Processing";
import ProviderOnboarding from "./pages/clinical/ProviderOnboarding";
import ReviewQueue from "./pages/cases/ReviewQueue";
import SAAuditLogs from "./pages/admin/SAAuditLogs";
import SAClients from "./pages/clients/SAClients";
import SADashboard from "./pages/admin/SADashboard";
import SASecuritySettings from "./pages/admin/SASecuritySettings";
import SAUsers from "./pages/admin/SAUsers";
import Settings from "./pages/core/Settings";
import SpecialistCaseView from "./pages/cases/SpecialistCaseView";
import StaffTracker from "./pages/staff/StaffTracker";
import SupervisorApprovalQueue from "./pages/cases/SupervisorApprovalQueue";
import UnmatchedDocuments from "./pages/cases/UnmatchedDocuments";
import RosterImport from "./pages/admin/RosterImport";
import RosterQueue from "./pages/eligibility/RosterQueue";
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
  "forgot-password": ForgotPassword,
  "reset-password": ResetPassword,
  "knowledge-base-analytics": KnowledgeBaseAnalytics,
  "new-verification": NewVerification,
  patients: Patients,
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
  "roster-import": RosterImport,
  "roster-queue": RosterQueue,
};

export const pagesConfig = {
  mainPage: "dashboard",
  Pages: PAGES,
  Layout: __Layout,
};
