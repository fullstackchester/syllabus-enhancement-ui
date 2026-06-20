import { createBrowserRouter, type RouteObject } from "react-router";

import Login from "@/pages/login.tsx";
import App from "@/App.tsx";
import Shell from "@/components/shell";
import CreateAccount from "./pages/create-account";
import Dashboard from "./pages/dashboard";
import Email from "./pages/emails";
import Accounts from "./pages/accounts";
import syllabusRoutes from "./routes/syllabus.routes";

const routeConfig: RouteObject[] = [
  {
    path: "/",
    Component: App,
    children: [
      {
        path: "",
        Component: Login,
      },
      {
        path: "create-account",
        Component: CreateAccount,
      },
      {
        Component: Shell,
        children: [
          {
            path: "dashboard",
            Component: Dashboard,
            handle: { title: "Dashboard" },
          },
          {
            path: "syllabus",
            children: syllabusRoutes,
          },
          {
            path: "emails",
            Component: Email,
            handle: { title: "Emails" },
          },
          {
            path: "accounts",
            Component: Accounts,
            handle: { title: "Accounts" },
          },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routeConfig);

export default router;
