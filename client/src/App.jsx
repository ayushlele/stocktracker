import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import NewEntryWizard from './pages/NewEntryWizard';
import AccessoryDashboard from './pages/AccessoryDashboard';
import AccessoryTypeList from './pages/AccessoryTypeList';
import NewAccessoryEntry from './pages/NewAccessoryEntry';
import AccessoryDetail from './pages/AccessoryDetail';
import ReferenceData from './pages/admin/ReferenceData';
import UserManagement from './pages/admin/UserManagement';
import Masters from './pages/admin/Masters';
import AccessoryMasters from './pages/admin/AccessoryMasters';
import Vendors from './pages/admin/Vendors';

function ProtectedRoute({ children, requireAdmin }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Fabric Stock */}
        <Route index element={<Dashboard />} />
        <Route path="stock/new" element={<NewEntryWizard />} />
        <Route path="stock/:id" element={<StockDetail />} />
        {/* Accessories */}
        <Route path="accessories" element={<AccessoryDashboard />} />
        <Route path="accessories/type/:typeId" element={<AccessoryTypeList />} />
        <Route path="accessories/new" element={<NewAccessoryEntry />} />
        <Route path="accessories/:id" element={<AccessoryDetail />} />
        {/* Admin */}
        <Route path="admin/masters" element={<ProtectedRoute requireAdmin><Masters /></ProtectedRoute>} />
        <Route path="admin/accessory-masters" element={<ProtectedRoute requireAdmin><AccessoryMasters /></ProtectedRoute>} />
        <Route path="admin/vendors" element={<ProtectedRoute requireAdmin><Vendors /></ProtectedRoute>} />
        <Route path="admin/reference" element={<ProtectedRoute requireAdmin><ReferenceData /></ProtectedRoute>} />
        <Route path="admin/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
