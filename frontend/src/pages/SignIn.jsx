import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LogIn, AlertCircle, Phone, Lock } from 'lucide-react';
import logo from '../components/logo.png';

const SignIn = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/auth/signin', { username, password });
      const { access_token, user } = res.data;

      localStorage.setItem('civic_token', access_token);
      localStorage.setItem('civic_user', JSON.stringify(user));

      if (onLoginSuccess) onLoginSuccess(user);

      // Redirect based on role
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'staff') navigate('/staff');
      else navigate('/citizen');

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid mobile number/email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jali-pattern min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <svg className="jali-road" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <path
          id="jaliRoadPath"
          className="jali-road-path"
          d="M -100,120 C 250,60 480,430 800,500 S 1350,900 1700,860"
        />
        <g className="jali-truck-group">
          <g transform="translate(-46,-24)">
            <rect x="2" y="6" width="36" height="18" rx="3" fill="#1E7A5C" />
            <rect x="4" y="9" width="30" height="4" fill="#ffffff" opacity="0.45" />
            <rect x="38" y="10" width="18" height="14" rx="3" fill="#233A5C" />
            <rect x="42" y="13" width="9" height="7" rx="1" fill="#BFD9FF" />
            <circle cx="13" cy="28" r="5" fill="#16130F" />
            <circle cx="13" cy="28" r="2" fill="#888888" />
            <circle cx="47" cy="28" r="5" fill="#16130F" />
            <circle cx="47" cy="28" r="2" fill="#888888" />
          </g>
          <animateMotion dur="16s" repeatCount="indefinite" rotate="auto">
            <mpath href="#jaliRoadPath" />
          </animateMotion>
        </g>
      </svg>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex mb-4">
          <img src={logo} alt="ECO-civic logo" className="w-16 h-16 object-contain" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">ECO-civic Sign In</h2>
        <p className="mt-2 text-sm text-emerald-300 font-medium">
          Access your Urban Local Body (ULB) Dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">
          
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Indian Phone (+91) or Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="+91 9876543210 or officer@ulb.gov.in"
                  className="pl-9 w-full rounded-xl border border-slate-300 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 w-full rounded-xl border border-slate-300 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            Don't have an account yet?{' '}
            <Link to="/signup" className="font-bold text-emerald-600 hover:underline">
              Register as Citizen / Staff / Officer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;