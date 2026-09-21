import React, { useState, useEffect } from 'react';
import api from '../services/api';
import OpenStreetMap from '../components/OpenStreetMap';
import AnimatedCounter from '../components/Animatedcounter';
import {
  ShieldCheck, Users, Truck, CheckCircle2, Clock, AlertTriangle,
  FileSpreadsheet, UserPlus, RefreshCw, Filter, Layers, ChevronRight,
  UploadCloud, Download
} from 'lucide-react';

const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [musterRoll, setMusterRoll] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [wardFilter, setWardFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal Duty Assignment State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignVehicleId, setAssignVehicleId] = useState('RJ-19-GA-1024');
  const [dutyNotes, setDutyNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Bin Excel Bulk Upload State
  const [binUploading, setBinUploading] = useState(false);
  const [binUploadResult, setBinUploadResult] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [wardFilter, statusFilter]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      let complaintsUrl = '/api/waste/complaints?mine_only=false';
      if (wardFilter) complaintsUrl += `&ward_no=${wardFilter}`;
      if (statusFilter) complaintsUrl += `&status_filter=${statusFilter}`;

      const [statsRes, complaintsRes, staffRes, musterRes, trucksRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get(complaintsUrl),
        api.get('/api/admin/staff'),
        api.get('/api/attendance/today'),
        api.get('/api/fleet/trucks')
      ]);

      setStats(statsRes.data);
      setComplaints(complaintsRes.data);
      setStaffList(staffRes.data);
      setMusterRoll(musterRes.data);
      if (trucksRes.data?.vehicles) setVehicles(trucksRes.data.vehicles);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint || !assignStaffId) return;

    const staffMember = staffList.find((s) => (s.id || s._id) === assignStaffId);
    setAssigning(true);

    try {
      await api.put(`/api/admin/complaints/${selectedComplaint.id || selectedComplaint._id}/assign`, {
        assigned_staff_id: assignStaffId,
        assigned_staff_name: staffMember ? staffMember.full_name : 'Sanitation Staff',
        assigned_vehicle_id: assignVehicleId,
        duty_notes: dutyNotes
      });

      setSelectedComplaint(null);
      setAssignStaffId('');
      fetchAdminData();
    } catch (err) {
      console.error('Assignment error:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusUpdate = async (complaintId, newStatus) => {
    try {
      await api.put(`/api/admin/complaints/${complaintId}/status`, {
        status: newStatus,
        resolution_notes: `Status changed to ${newStatus} by Municipal Officer`
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBinExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBinUploading(true);
    setBinUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/admin/bins/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBinUploadResult({ success: true, ...res.data });
    } catch (err) {
      setBinUploadResult({
        success: false,
        detail: err.response?.data?.detail || 'Upload failed. Please check the file format.'
      });
    } finally {
      setBinUploading(false);
      e.target.value = '';
    }
  };

  const downloadBinTemplate = () => {
    const csvContent =
      'ward_no,landmark,latitude,longitude,wet_fill,dry_fill,hazardous_fill\n' +
      'Ward-101,Near Sojati Gate Market,26.2413,73.0257,20,10,5\n' +
      'Ward-102,Sardarpura Vegetable Mandi Entrance,26.2343,73.0137,15,25,0\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eco-civic-bin-upload-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="jali-pattern bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <div className="inline-flex items-center space-x-2 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Swachh Municipal Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {stats?.ulb_name || 'Jodhpu Nagar Palika'}
          </h1>
          <p className="text-purple-200/80 text-sm mt-1">
            Officer: <strong className="text-white">{user?.full_name}</strong> | Code: {stats?.ulb_code || 'ULB-01'}
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur border border-white/20 transition-all flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="reveal reveal-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-2xl font-black text-slate-900"><AnimatedCounter value={stats?.complaints?.pending ?? 0} /></h3>
          </div>
        </div>

        <div className="reveal reveal-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Assigned Duties</p>
            <h3 className="text-2xl font-black text-slate-900"><AnimatedCounter value={stats?.complaints?.assigned ?? 0} /></h3>
          </div>
        </div>

        <div className="reveal reveal-3 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Resolved Rate</p>
            <h3 className="text-2xl font-black text-slate-900"><AnimatedCounter value={stats?.complaints?.clearance_rate_percent ?? 100} decimals={1} suffix="%" /></h3>
          </div>
        </div>

        <div className="reveal reveal-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Staff On Duty</p>
            <h3 className="text-2xl font-black text-slate-900"><AnimatedCounter value={stats?.workforce?.active_on_duty_today ?? 0} /></h3>
          </div>
        </div>
      </div>

      {/* Live Map Overview */}
      <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 space-y-4">
        <h2 className="font-extrabold text-lg text-slate-900">Ward Operations & Fleet GPS Map</h2>
        <OpenStreetMap
          center={[26.2389, 73.0243]}
          zoom={12}
          vehicles={vehicles}
          complaints={complaints}
          height="360px"
        />
      </div>

      {/* Bulk Community Bin Upload via Excel/CSV */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200 space-y-4">
        <div>
          <h2 className="font-extrabold text-xl text-slate-900 flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-purple-600" />
            <span>Bulk Add Community Bins (Excel / CSV)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload an .xlsx or .csv sheet with columns: <code className="bg-slate-100 px-1 rounded">ward_no, landmark, latitude, longitude</code>
            {' '}(optional: <code className="bg-slate-100 px-1 rounded">wet_fill, dry_fill, hazardous_fill</code>).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow flex items-center space-x-2 transition-all">
            <UploadCloud className="w-4 h-4" />
            <span>{binUploading ? 'Uploading...' : 'Choose File & Upload'}</span>
            <input
              type="file"
              accept=".xlsx,.xlsm,.csv"
              onChange={handleBinExcelUpload}
              disabled={binUploading}
              className="hidden"
            />
          </label>

          <button
            onClick={downloadBinTemplate}
            className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Sample Template</span>
          </button>
        </div>

        {binUploadResult && (
          <div className={`p-4 rounded-2xl text-xs font-medium border ${
            binUploadResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {binUploadResult.success ? (
              <>
                <p className="font-bold mb-1">
                  ✓ {binUploadResult.inserted} bin{binUploadResult.inserted === 1 ? '' : 's'} added
                  {binUploadResult.skipped > 0 && `, ${binUploadResult.skipped} row(s) skipped`}.
                </p>
                {binUploadResult.errors?.length > 0 && (
                  <ul className="list-disc list-inside mt-2 space-y-0.5 text-rose-700">
                    {binUploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <p className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{binUploadResult.detail}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Complaint Triage & Duty Allocation Board */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-extrabold text-xl text-slate-900 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <span>Ward Complaint Triage & Allocation Board</span>
            </h2>
            <p className="text-xs text-slate-500">Assign sanitation staff and compactor trucks to citizen complaints.</p>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="rounded-xl border border-slate-300 py-1.5 px-3 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">All Wards</option>
              <option value="Ward-101">Ward-101</option>
              <option value="Ward-102">Ward-102</option>
              <option value="Ward-103">Ward-103</option>
              <option value="Ward-104">Ward-104</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 py-1.5 px-3 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="p-3">Complaint ID</th>
                <th className="p-3">Ward / Landmark</th>
                <th className="p-3">AI Waste Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned Staff</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No complaints matching current ward filter.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id || c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">#{c.id || c._id}</td>
                    <td className="p-3">
                      <strong className="text-slate-900">{c.ward_no}</strong>
                      <p className="text-[11px] text-slate-500">{c.landmark}</p>
                    </td>
                    <td className="p-3">
                      {c.ai_classification ? (
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          c.ai_classification.bin_color === 'Green' ? 'bg-emerald-100 text-emerald-800' :
                          c.ai_classification.bin_color === 'Blue' ? 'bg-blue-100 text-blue-800' :
                          c.ai_classification.bin_color === 'Black/Red' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.ai_classification.primary_category} ({c.ai_classification.bin_color})
                        </span>
                      ) : (
                        <span className="text-slate-400">Manual Inspection</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'Assigned' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {c.assigned_to ? (
                        <span className="font-semibold text-slate-800">{c.assigned_to.assigned_staff_name}</span>
                      ) : (
                        <span className="text-rose-500 font-bold">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedComplaint(c)}
                        className="bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-bold border border-purple-200 transition-colors"
                      >
                        Assign Duty
                      </button>

                      {c.status !== 'Resolved' && (
                        <button
                          onClick={() => handleStatusUpdate(c.id || c._id, 'Resolved')}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold border border-emerald-200 transition-colors"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Muster Roll Today */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200 space-y-4">
        <h2 className="font-extrabold text-xl text-slate-900 flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-purple-600" />
          <span>Sanitation Staff Muster Roll (Today's Geo Check-Ins)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {musterRoll.length === 0 ? (
            <div className="col-span-full p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              No staff check-ins logged for today yet.
            </div>
          ) : (
            musterRoll.map((m) => (
              <div key={m.id || m._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{m.staff_name}</h4>
                    <p className="text-slate-500">{m.staff_phone} | {m.ward_no}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                    {m.status}
                  </span>
                </div>
                <div className="text-slate-600">
                  <p>In: <strong>{new Date(m.check_in_time).toLocaleTimeString()}</strong></p>
                  {m.check_out_time && <p>Out: <strong>{new Date(m.check_out_time).toLocaleTimeString()}</strong> ({m.shift_duration_hours}h)</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Duty Assignment Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-lg text-slate-900">
              Assign Duty for Complaint #{selectedComplaint.id || selectedComplaint._id}
            </h3>
            <p className="text-xs text-slate-600">Landmark: <strong>{selectedComplaint.landmark}</strong> ({selectedComplaint.ward_no})</p>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Sanitation Staff Member</label>
                <select
                  required
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 text-xs font-medium bg-white"
                >
                  <option value="">-- Choose Worker --</option>
                  {staffList.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.full_name} ({s.phone}) - {s.ward_no}
                    </option>
                  ))}
                  {/* Fallback option if staff list is empty */}
                  <option value="staff_demo_01">Ramesh Kumar (Sanitation Driver)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Municipal Vehicle</label>
                <select
                  value={assignVehicleId}
                  onChange={(e) => setAssignVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 text-xs font-medium bg-white"
                >
                  <option value="RJ-19-GA-1024">Compactor Truck RJ-19-GA-1024</option>
                  <option value="RJ-19-GA-2048">Tipper Auto RJ-19-GA-2048</option>
                  <option value="RJ-19-GA-3096">Compactor Truck RJ-19-GA-3096</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="flex-1 border border-slate-300 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-xs font-bold shadow"
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;