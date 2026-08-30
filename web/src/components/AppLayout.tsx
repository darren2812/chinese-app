import { useState } from "react";
import { Outlet } from "react-router";
import AppSidebar from "./AppSidebar";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <AppSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((isOpen) => !isOpen)}
      />
      <Outlet />
    </div>
  );
}
