import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import RegisterCar from '@/pages/RegisterCar'
import Maintenance from '@/pages/Maintenance'
import FinishedCars from '@/pages/FinishedCars'
import CarDetail from '@/pages/CarDetail'
import CustomerDetail from '@/pages/CustomerDetail'
import Customers from '@/pages/Customers'
import Invoices from '@/pages/Invoices'
import InvoicePrint from '@/pages/InvoicePrint'
import PartsStock from '@/pages/PartsStock'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

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
            <Route path="settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
