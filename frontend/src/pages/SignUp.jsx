import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { UserCheck, ShieldCheck, Sparkles, AlertCircle, Phone, Lock, User, Building } from 'lucide-react';
import logo from '../components/logo.png';

// Friendly locality names for the original seeded wards; any ward beyond
// these (added later via bulk bin upload) just shows its plain code.
const WARD_LOCALITY_NAMES = {
  'Ward-101': 'Sardarpura',
  'Ward-102': 'Sojati Gate',
  'Ward-103': 'Ratanada',
  'Ward-104': 'Paota'
};

const SignUp = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    role: 'citizen',
    ward_no: 'Ward-101',
    ulb_name: 'Jodhpur Municipal Corporation',
    district: 'Jodhpur',
    state: 'Rajasthan',
    pincode: '342001'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableWards, setAvailableWards] = useState([]);

  useEffect(() => {
    api.get('/api/waste/wards')
      .then((res) => setAvailableWards(res.data || []))
      .catch((err) => console.warn('Could not load ward list:', err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email || null,
        password: formData.password,
        role: formData.role,
        ward_no: formData.ward_no,
        address: {
          ulb_name: formData.ulb_name,
          ward_no: formData.ward_no,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode
        }
      };

      const res = await api.post('/api/auth/signup', payload);
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
      const detail = err.response?.data?.detail;
      let message = 'Registration failed. Please check inputs and phone format (+91).';
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        // FastAPI validation errors: array of {loc, msg, type}
        message = detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || JSON.stringify(detail);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jali-pattern min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <svg className="jali-road" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <path
          className="jali-road-path"
          d="M -100,120 C 250,60 480,430 800,500 S 1350,900 1700,860"
        />
      </svg>
      <div className="jali-truck" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex mb-4">
          <img src={logo} alt="ECO-civic logo" className="w-16 h-16 object-contain" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">ECO-civic ULB Portal</h2>
        <p className="mt-2 text-sm text-emerald-300 font-medium">
          Indian Municipal Civic Tech Waste Management Registration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">

          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Select User Role</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'citizen' })}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    formData.role === 'citizen'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Citizen
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'staff' })}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    formData.role === 'staff'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sanitation Worker
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'admin' })}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    formData.role === 'admin'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Municipal Officer
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Rajesh Sharma"
                  className="pl-9 w-full rounded-xl border border-slate-300 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Indian Mobile (+91)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    +91
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="pl-11 w-full rounded-xl border border-slate-300 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.in"
                  className="w-full rounded-xl border border-slate-300 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="pl-9 w-full rounded-xl border border-slate-300 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Ward No & ULB Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Municipal Ward No</label>
                <select
                  name="ward_no"
                  value={formData.ward_no}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  {availableWards.map((w) => (
                    <option key={w} value={w}>
                      {w}{WARD_LOCALITY_NAMES[w] ? ` (${WARD_LOCALITY_NAMES[w]})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  name="pincode"
                  required
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="342001"
                  className="w-full rounded-xl border border-slate-300 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <span>Registering Account...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/signin" className="font-bold text-emerald-600 hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;