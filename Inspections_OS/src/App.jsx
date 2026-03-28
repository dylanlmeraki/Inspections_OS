import { Suspense, lazy } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import WizardPage from "@/pages/WizardPage";
import SourceLibraryPage from "@/pages/SourceLibraryPage";

const ExportCenterPage = lazy(() => import("@/pages/ExportCenterPage"));

function RouteFallback() {
  return <div className="card">Loading…</div>;
}

export default function App() {
  return (
    <div className="app-shell">
      <div className="nav">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/wizard">Wizard Runner</NavLink>
        <NavLink to="/exports">Export Center</NavLink>
        <NavLink to="/sources">Source Library</NavLink>
      </div>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/wizard" element={<WizardPage />} />
          <Route path="/exports" element={<ExportCenterPage />} />
          <Route path="/sources" element={<SourceLibraryPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}
