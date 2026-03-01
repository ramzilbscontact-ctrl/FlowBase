import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { useAuthStore } from '../store/authStore'

// Lazy-loaded pages
const Login           = lazy(() => import('../pages/auth/Login'))
const Dashboard       = lazy(() => import('../pages/Dashboard'))
const Contacts        = lazy(() => import('../pages/crm/Contacts'))
const Companies       = lazy(() => import('../pages/crm/Companies'))
const Deals           = lazy(() => import('../pages/crm/Deals'))
const Tasks           = lazy(() => import('../pages/crm/Tasks'))
const Invoices        = lazy(() => import('../pages/facturation/Invoices'))
const Quotes          = lazy(() => import('../pages/facturation/Quotes'))
const Payments        = lazy(() => import('../pages/facturation/Payments'))
const Journal         = lazy(() => import('../pages/compta/Journal'))
const Reports         = lazy(() => import('../pages/compta/Reports'))
const Employees       = lazy(() => import('../pages/rh/Employees'))
const Leaves          = lazy(() => import('../pages/rh/Leaves'))
const CalendarPage    = lazy(() => import('../pages/CalendarPage'))
const Workflows       = lazy(() => import('../pages/Workflows'))
const Analytics       = lazy(() => import('../pages/Analytics'))
const Integrations    = lazy(() => import('../pages/integrations/IntegrationPage'))
const NotFound        = lazy(() => import('../pages/NotFound'))

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-full py-20 text-gray-400 text-sm">
      Chargement…
    </div>
  )
}

const wrap = (el) => (
  <PrivateRoute>
    <Suspense fallback={<Loader />}>{el}</Suspense>
  </PrivateRoute>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={<Loader />}><Login /></Suspense>,
  },
  {
    element: <PrivateRoute><AppLayout /></PrivateRoute>,
    children: [
      { index: true,                    element: wrap(<Dashboard />) },
      { path: 'crm/contacts',           element: wrap(<Contacts />) },
      { path: 'crm/companies',          element: wrap(<Companies />) },
      { path: 'crm/deals',              element: wrap(<Deals />) },
      { path: 'crm/tasks',              element: wrap(<Tasks />) },
      { path: 'facturation/invoices',   element: wrap(<Invoices />) },
      { path: 'facturation/quotes',     element: wrap(<Quotes />) },
      { path: 'facturation/payments',   element: wrap(<Payments />) },
      { path: 'compta/journal',         element: wrap(<Journal />) },
      { path: 'compta/reports',         element: wrap(<Reports />) },
      { path: 'rh/employees',           element: wrap(<Employees />) },
      { path: 'rh/leaves',              element: wrap(<Leaves />) },
      { path: 'calendar',               element: wrap(<CalendarPage />) },
      { path: 'workflows',              element: wrap(<Workflows />) },
      { path: 'analytics',              element: wrap(<Analytics />) },
      { path: 'integrations/*',         element: wrap(<Integrations />) },
      { path: '*',                      element: <Suspense fallback={null}><NotFound /></Suspense> },
    ],
  },
])
