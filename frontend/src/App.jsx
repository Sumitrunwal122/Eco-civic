import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import CitizenDashboard from './pages/CitizenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('civic_user');
    const token = localStorage.getItem('civic_token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse user session:', err);
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('civic_token');
    localStorage.removeItem('civic_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-emerald-400">Loading SwachhCivic Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Navbar user={user} onLogout={handleLogout} />

        <main className="mb-auto">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/signin"
              element={
                user ? (
                  <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff' : '/citizen'} replace />
                ) : (
                  <SignIn onLoginSuccess={handleLoginSuccess} />
                )
              }
            />
            <Route
              path="/signup"
              element={
                user ? (
                  <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff' : '/citizen'} replace />
                ) : (
                  <SignUp onLoginSuccess={handleLoginSuccess} />
                )
              }
            />

            {/* Protected Role-Based Routes */}
            <Route
              path="/citizen"
              element={
                <ProtectedRoute user={user} allowedRoles={['citizen']}>
                  <CitizenDashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <AdminDashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute user={user} allowedRoles={['staff', 'admin']}>
                  <StaffDashboard user={user} />
                </ProtectedRoute>
              }
            />

            {/* Default Catch-all Redirect */}
            <Route
              path="*"
              element={
                user ? (
                  <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'staff' ? '/staff' : '/citizen'} replace />
                ) : (
                  <Navigate to="/signin" replace />
                )
              }
            />
          </Routes>
        </main>

        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-center text-xs">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-semibold text-slate-300">
              Civic Tech Waste Management Platform &copy; 2026 | Urban Local Bodies (ULBs)
            </p>
            <p className="mt-1 text-slate-500">
              Compliant with Swachh Bharat Abhiyan & Solid Waste Management Rules (MSW 2016)
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
