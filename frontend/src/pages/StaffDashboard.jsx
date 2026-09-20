import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  UserCheck, LogOut, CheckCircle2, Clock, MapPin, AlertCircle,
  Truck, ShieldCheck, RefreshCw, Send, CheckSquare
} from 'lucide-react';

const StaffDashboard = ({ user }) => {
  const [activeAttendance, setActiveAttendance] = useState(null);
  const [assignedComplaints, setAssignedComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [coords, setCoords] = useState({ lat: 26.2389, lng: 73.0243 });

  // Status update modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    fetchStaffData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Geo error:', err)
      );
    }
  }, []);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [attRes, compRes] = await Promise.all([
        api.get('/api/attendance/my-status'),
        api.get(`/api/waste/complaints?ward_no=${user?.ward_no || 'Ward-101'}`)
      ]);

      setActiveAttendance(attRes.data);
      setAssignedComplaints(compRes.data);
    } catch (err) {
      console.error('Failed to load staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    setMsg('');
    try {
      const res = await api.post('/api/attendance/check-in', {
        ward_no: user?.ward_no || 'Ward-101',
        latitude: coords.lat,
        longitude: coords.lng,
        notes: 'Sanitation shift started'
      });
      setActiveAttendance(res.data);
      setMsg('Check-In recorded successfully! Have a safe shift.');
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Check-In failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setMsg('');
    try {
      const res = await api.post('/api/attendance/check-out', {
        latitude: coords.lat,
        longitude: coords.lng,
        notes: 'Shift completed'
      });
      setActiveAttendance(null);
      setMsg(`Shift completed! Duration: ${res.data.shift_duration_hours} hours.`);
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Check-Out failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setActionLoading(true);
    try {
      await api.put(`/api/admin/complaints/${selectedTask.id || selectedTask._id}/status`, {
        status: 'Resolved',
        resolution_notes: resolutionNotes || 'Cleared by sanitation worker'
      });

      setSelectedTask(null);
      setResolutionNotes('');
      fetchStaffData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="jali-pattern bg-gradient-to-r from-amber-700 via-slate-900 to-amber-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30 mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Sanitation Staff & Worker Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-amber-200/80 text-sm mt-1">
            Assigned Ward: <strong className="text-white">{user?.ward_no || 'Ward-101'}</strong> | Mobile: {user?.phone}
          </p>
        </div>

        <button
          onClick={fetchStaffData}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur border border-white/20 transition-all flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {msg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="font-semibold">{msg}</span>
        </div>
      )}

      {/* Grid: Geo Attendance Tracker & Assigned Duties */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Geo Attendance Card (1 col) */}
        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 space-y-6 flex flex-col justify-between">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 flex items-center space-x-2 mb-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <span>Geo Shift Attendance</span>
            </h2>
            <p className="text-xs text-slate-500">
              One-tap GPS check-in/check-out for municipal sanitation muster roll.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Shift Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  activeAttendance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {activeAttendance ? 'ON DUTY' : 'OFF DUTY'}
                </span>
              </div>

              {activeAttendance && (
                <div className="text-xs space-y-1 text-slate-700">
                  <p>Check-In Time: <strong>{new Date(activeAttendance.check_in_time).toLocaleTimeString()}</strong></p>
                  <p>Location: <strong className="font-mono text-[11px]">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</strong></p>
                </div>
              )}
            </div>
          </div>

          <div>
            {activeAttendance ? (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>End Shift & Check-Out</span>
              </button>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center space-x-2 text-sm"
              >
                <UserCheck className="w-4 h-4" />
                <span>Start Shift & Check-In</span>
              </button>
            )}
          </div>
        </div>

        {/* Ward Duties Checklist (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-extrabold text-xl text-slate-900 flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-amber-600" />
                <span>Ward Clearance Duties ({assignedComplaints.length})</span>
              </h2>
              <p className="text-xs text-slate-500">Open citizen waste complaints requiring pickup in your ward.</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {assignedComplaints.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No active complaints pending in {user?.ward_no || 'your ward'}. All clear!
              </div>
            ) : (
              assignedComplaints.map((c) => (
                <div key={c.id || c._id} className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 transition-all bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900">#{c.id || c._id}</span>
                      <p className="text-xs text-slate-800 font-semibold">📍 {c.landmark} ({c.ward_no})</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                      c.status === 'Assigned' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {c.ai_classification && (
                    <div className="p-3 bg-white rounded-xl text-xs border border-slate-200 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>Category: {c.ai_classification.primary_category}</span>
                        <span className="text-emerald-700">{c.ai_classification.bin_color} Bin</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{c.ai_classification.handling_instructions}</p>
                    </div>
                  )}

                  {c.status !== 'Resolved' && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setSelectedTask(c)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Clear & Mark Resolved</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Completion Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-lg text-slate-900">
              Confirm Clearance for #{selectedTask.id || selectedTask._id}
            </h3>
            <p className="text-xs text-slate-600">Location: <strong>{selectedTask.landmark}</strong></p>

            <form onSubmit={handleResolveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Waste collected via Compactor Truck RJ-19-GA-1024 and sent to DWCC."
                  className="w-full rounded-xl border border-slate-300 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 border border-slate-300 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold shadow"
                >
                  Confirm Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;