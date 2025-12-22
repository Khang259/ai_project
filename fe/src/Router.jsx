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

const withPrivate = (element, requiredRole) => (
  <PrivateRoute requiredRole={requiredRole}>{element}</PrivateRoute>
);

const withAdminLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// Routers
const routes = [
  // Public
  { path: "/", element: <LoginPage /> },
  { path: "/login", element: <LoginPage /> },
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

  // Admin/operator routes (with layout)
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
    path: "/settings",
    element: withPrivate(withAdminLayout(<Settings />), ["admin", "operator"]),
  },
];

export default routes