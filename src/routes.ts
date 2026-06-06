import { createBrowserRouter, type RouteObject } from 'react-router';

import Login from "@/pages/login.tsx";
import App from "@/App.tsx";
import Shell from '@/components/shell';
import CreateAccount from './pages/create-account';
import Dashboard from './pages/dashboard';
import Syllabus from './pages/syllabus';

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
        Component: Shell,
        children: [
          {
            path: 'dashboard',
            Component: Dashboard,
            handle: { title: 'Dashboard' },
          },
          {
            path: 'syllabus',
            Component: Syllabus,
            handle: { title: 'Syllabus' },
          },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routeConfig);

export default router;