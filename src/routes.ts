import { createBrowserRouter, type RouteObject } from 'react-router';
// import 

import Login from "@/pages/login.tsx";
import App from "@/App.tsx";
import CreateAccount from './pages/create-account';
import Dashboard from './pages/dashboard';

const routeConfig: RouteObject[] = [
  {
    path: '/',
    Component: App,
    children: [
      {
        path: '',
        Component: Login,
      },
      {
        path: 'create-account',
        Component: CreateAccount,
      },
      {
        path: 'dashboard',
        Component: Dashboard,
      },
    ],
  },
];

const router = createBrowserRouter(routeConfig);

export default router;