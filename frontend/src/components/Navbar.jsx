import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {  ShieldCheck, UserCheck, LogOut, Sparkles } from 'lucide-react';
 import logo from '../assets/logo.png';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate('/signin');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-300">Municipal Officer (Admin)</span>;
      case 'staff':
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300">Sanitation Worker (Staff)</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">Citizen</span>;
    }
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-tr from-emerald-500 to-green-400 p-2 rounded-xl text-slate-950 group-hover:scale-105 transition-transform">
             <div className="bg-white p-1.5 rounded-xl group-hover:scale-105 transition-transform"> 
              <img src={logo} alt="ECO-civic logo" className="w-8 h-8 object-contain" /> </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  ECO-civic
                </span>
                <span className="text-[10px] bg-orange-500 text-white uppercase px-1.5 py-0.5 rounded font-bold tracking-wider">
                  Swachh Bharat
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Urban Local Body (ULB) Management</p>
            </div>
          </Link>

          {/* User Profile & Controls */}
          {user ? (
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-100">{user.full_name}</p>
                <div className="mt-0.5">{getRoleBadge(user.role)}</div>
              </div>
              <button
                onClick={handleLogoutClick}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-700"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/signin"
                className="text-slate-300 hover:text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-1.5 rounded-lg shadow transition-all flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
