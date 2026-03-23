import React from "react";

import DashboardLayout from "./components/DashboardLayout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";

import Dashboard from "./pages/DashBoard.jsx";
import Analytics from "./pages/Analytics.jsx";
import TaskManagement from "./pages/TaskManagement.jsx";
import Notification from "./pages/Notification.jsx";
import Users from "./pages/Users.jsx";
import Settings from "./pages/Settings.jsx";
import LoginPage from "./pages/Login.jsx";
import Maintain from "./pages/Maintain.jsx";
import MonitorPackaged from "./pages/MonitorPackaged.jsx";
import MobileGridDisplay from "./pages/MobileGridDisplay.jsx";
import MonitorPage from "./pages/Monitor.jsx";
import Area from "./pages/Area.jsx";
import WarehouseMap from "./pages/WarehouseMap.jsx";
import CallerWE from "./pages/CallerWE.jsx";
import VHLInterface from "./pages/VHLInterface.jsx";

const withPrivate = (element, requiredRole) => (
  <PrivateRoute requiredRole={requiredRole}>{element}</PrivateRoute>
);

const withAdminLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// Routers
const routes = [
  // Public routes
  { path: "/", element: <LoginPage /> },
  { path: "/login", element: <LoginPage /> },
  
  // User routes (require authentication)
  {
    path: "/mobile-grid-display",
    element: withPrivate(<MobileGridDisplay />),
  },
  {
    path: "/monitor",
    element: <MonitorPage />,
  },
  {
    path: "/monitor-packaged",
    element: withPrivate(<MonitorPackaged />),
  },
  {
    path: "/caller-we",
    element:<CallerWE />,
  },
  {
    path: "/vhl-interface",
    element: <VHLInterface />,
  },

  // Admin/operator routes (with layout and role-based access)
  {
    path: "/dashboard",
    element: withPrivate(withAdminLayout(<Dashboard />), ["admin", "operator"]),
  },
  {
    path: "/maintain",
    element: withPrivate(withAdminLayout(<Maintain />), ["admin", "operator"]),
  },
  {
    path: "/analytics",
    element: withPrivate(withAdminLayout(<Analytics />), ["admin", "operator"]),
  },
  {
    path: "/task-management",
    element: withPrivate(withAdminLayout(<TaskManagement />), ["admin", "operator"]),
  },
  {
    path: "/notification",
    element: withPrivate(withAdminLayout(<Notification />), ["admin", "operator"]),
  },
  {
    path: "/users",
    element: withPrivate(withAdminLayout(<Users />), ["admin", "operator"]),
  },
  {
    path: "/area",
    element: withPrivate(withAdminLayout(<Area />), ["admin"]),
  },
  {
    path: "/warehouse-map",
    element: withPrivate(withAdminLayout(<WarehouseMap />), ["admin", "operator"]),
  },
  {
    path: "/settings",
    element: withPrivate(withAdminLayout(<Settings />), ["admin", "operator"]),
  },
];

export default routes;