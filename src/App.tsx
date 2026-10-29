import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'

// Pages in lazy-loading: the code is split per route, the initial bundle
// only contains the shell + Login. Functionality and routing are unchanged.
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const RegisterCar = lazy(() => import('@/pages/RegisterCar'))
const Maintenance = lazy(() => import('@/pages/Maintenance'))
const FinishedCars = lazy(() => import('@/pages/FinishedCars'))
const CarDetail = lazy(() => import('@/pages/CarDetail'))
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'))
const Customers = lazy(() => import('@/pages/Customers'))
const Invoices = lazy(() => import('@/pages/Invoices'))
const InvoicePrint = lazy(() => import('@/pages/InvoicePrint'))
const PartsStock = lazy(() => import('@/pages/PartsStock'))
const Reports = lazy(() => import('@/pages/Reports'))
const Settings = lazy(() => import('@/pages/Settings'))
const Revenue = lazy(() => import('@/pages/Revenue'))

function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { loading, configured, isStaff } = useAuth()
  if (loading) return null
  if (!configured || !isStaff) return <Navigate to="/login" replace />
  return children ? <>{children}</> : <Outlet />
}

function RequireAdmin({ children }: { children?: React.ReactNode }) {
  const { loading, isAdmin } = useAuth()
  if (loading) return null
  if (!isAdmin) return <Navigate to="/" replace />
  return children ? <>{children}</> : <Outlet />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { loading, configured, isStaff } = useAuth()
  if (loading) return null
  if (configured && isStaff) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="register" element={<RegisterCar />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="finished" element={<FinishedCars />} />
            <Route path="job/:id" element={<CarDetail />} />
            <Route path="customer/:id" element={<CustomerDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoice/new" element={<Invoices />} />
            <Route path="invoice/:id/print" element={<InvoicePrint />} />
            <Route path="parts" element={<PartsStock />} />
            <Route path="reports" element={<Reports />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
