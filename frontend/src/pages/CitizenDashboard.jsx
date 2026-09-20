import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { fleetWS } from '../services/websocket';
import OpenStreetMap from '../components/OpenStreetMap';
import CameraCaptureModal from '../components/CameraCaptureModal';
import {
   Camera, MapPin, Upload, AlertCircle, CheckCircle2,
  Trash2, Layers, RefreshCw, Send, ShieldAlert, Info
} from 'lucide-react';

// Friendly locality names for the original seeded wards; any ward beyond
// these (added later via bulk bin upload) just shows its plain code.
const WARD_LOCALITY_NAMES = {
  'Ward-101': 'Sardarpura',
  'Ward-102': 'Sojati Gate',
  'Ward-103': 'Ratanada',
  'Ward-104': 'Paota'
};

const CitizenDashboard = ({ user }) => {
  const [vehicles, setVehicles] = useState([]);
  const [communityBins, setCommunityBins] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [availableWards, setAvailableWards] = useState([]);

  // Form State
  const [wardNo, setWardNo] = useState(user?.ward_no || 'Ward-101');
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCoords, setSelectedCoords] = useState({ lat: 26.2389, lng: 73.0243 });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  // AI Classification Tool State
  const [aiTestFile, setAiTestFile] = useState(null);
  const [aiTestPreview, setAiTestPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Camera Modal
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    // 1. Fetch snapshot & initial complaints
    fetchInitialData();

    // 1b. Fetch live ward list (from uploaded bins / filed complaints)
    api.get('/api/waste/wards')
      .then((res) => setAvailableWards(res.data || []))
      .catch((err) => console.warn('Could not load ward list, using defaults:', err));

    // 2. Connect WebSocket stream for real-time fleet vehicles
    fleetWS.connect();
    const unsubscribe = fleetWS.subscribe((data) => {
      if (data.event_type === 'FLEET_GPS_UPDATE') {
        if (data.vehicles) setVehicles(data.vehicles);
        if (data.community_bins) setCommunityBins(data.community_bins);
      }
    });

    // 3. Auto-detect browser location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSelectedCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.warn('Geolocation access denied:', err)
      );
    }

    return () => {
      unsubscribe();
      fleetWS.disconnect();
    };
  }, []);

  const fetchInitialData = async () => {
    setLoadingComplaints(true);
    try {
      const [trucksRes, binsRes, complaintsRes] = await Promise.all([
        api.get('/api/fleet/trucks'),
        api.get('/api/fleet/bins'),
        api.get('/api/waste/complaints?mine_only=true')
      ]);

      if (trucksRes.data?.vehicles) setVehicles(trucksRes.data.vehicles);
      if (binsRes.data?.community_bins) setCommunityBins(binsRes.data.community_bins);
      if (complaintsRes.data) setComplaints(complaintsRes.data);
    } catch (err) {
      console.error('Failed to load citizen dashboard data:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const handleMapLocationSelect = (lat, lng) => {
    setSelectedCoords({ lat, lng });
  };

  const handlePhotoCapture = (file, dataUrl) => {
    setPhotoFile(file);
    setPhotoPreview(dataUrl);
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitSuccess('');
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('ward_no', wardNo);
      formData.append('landmark', landmark);
      formData.append('description', description);
      formData.append('latitude', selectedCoords.lat);
      formData.append('longitude', selectedCoords.lng);
      if (photoFile) {
        formData.append('file', photoFile);
      }

      const res = await api.post('/api/waste/complaint', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmitSuccess(`Complaint #${res.data.id} filed successfully! Gemini Vision AI has parsed the location and bin category.`);
      setLandmark('');
      setDescription('');
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.detail || 'Failed to submit complaint. Please check fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantAIClassify = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAiTestFile(file);
    setAiTestPreview(URL.createObjectURL(file));
    setAiLoading(true);
    setAiResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/api/waste/classify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAiResult(res.data);
    } catch (err) {
      console.error('AI Classification failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="jali-pattern bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30 mb-2">
            <span>Swachh Bharat Citizen Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-emerald-200/80 text-sm mt-1">
            Ward: <strong className="text-white">{user?.ward_no || 'Ward-101'}</strong> | Track garbage trucks in real time & report unsegregated waste heaps.
          </p>
        </div>

        <button
          onClick={fetchInitialData}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur border border-white/20 transition-all flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loadingComplaints ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Grid Section 1: Live Map & Gemini AI Classifier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live OpenStreetMap (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-md border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <span>Live Municipal Vehicle & Bin Tracker</span>
              </h2>
              <p className="text-xs text-slate-500">
                Click anywhere on the map to set location for your waste complaint pin.
              </p>
            </div>
            <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Live GPS Stream</span>
            </span>
          </div>

          <OpenStreetMap
            center={[selectedCoords.lat, selectedCoords.lng]}
            zoom={13}
            vehicles={vehicles}
            complaints={complaints}
            communityBins={communityBins}
            selectedLocation={selectedCoords}
            onLocationSelect={handleMapLocationSelect}
            height="420px"
          />

          <div className="flex flex-wrap gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-sky-600 inline-block"></span>
              <strong className="text-slate-800">Garbage Truck (Live)</strong>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span>Pending Complaint</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
              <span>Assigned Duty</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
              <span>Resolved</span>
            </span>
          </div>
        </div>

        {/* Gemini Vision AI Waste Classifier Tool (1 col) */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-2">
              <span> Vision AI </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Instant Swachh Waste Segregator</h3>
            <p className="text-xs text-slate-400 mb-6">
              Upload a waste photo to classify into Swachh Bharat bins: Green (Wet), Blue (Dry), Black/Red (Hazardous), Yellow (Sanitary).
            </p>

            <div className="space-y-4">
              <label className="block w-full cursor-pointer bg-slate-800 hover:bg-slate-700/80 border-2 border-dashed border-slate-700 rounded-2xl p-4 text-center transition-all">
                <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  {aiTestFile ? aiTestFile.name : 'Upload Waste Photo to Test AI'}
                </span>
                <input type="file" accept="image/*" onChange={handleInstantAIClassify} className="hidden" />
              </label>

              {aiLoading && (
                <div className="p-4 bg-slate-800/80 rounded-2xl text-center space-y-2 border border-slate-700">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs text-emerald-300 font-medium">Analyzing visual features via Gemini Vision API...</p>
                </div>
              )}

              {aiResult && (
                <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                    <span className="font-bold text-white text-sm">{aiResult.primary_category}</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      aiResult.bin_color === 'Green' ? 'bg-emerald-500 text-slate-950' :
                      aiResult.bin_color === 'Blue' ? 'bg-blue-500 text-white' :
                      aiResult.bin_color === 'Black/Red' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                    }`}>
                      {aiResult.bin_color} Bin
                    </span>
                  </div>
                  <p className="text-slate-300"><strong className="text-slate-100">Instructions:</strong> {aiResult.handling_instructions}</p>
                  <p className="text-emerald-400"><strong className="text-emerald-300">ULB Advisory:</strong> {aiResult.swachh_bharat_advisory}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Adheres to Indian MSW Rules 2016 & Swachh Bharat Abhiyan
          </div>
        </div>
      </div>

      {/* Grid Section 2: Complaint Filing Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Complaint Filing Form */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-extrabold text-xl text-slate-900 flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-emerald-600" />
                <span>File Waste Complaint</span>
              </h2>
              <p className="text-xs text-slate-500">Report uncollected garbage, overflow bins, or blackspots.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center space-x-1.5"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Camera</span>
            </button>
          </div>

          {submitSuccess && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleComplaintSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ward Number</label>
                <select
                  value={wardNo}
                  onChange={(e) => setWardNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {availableWards.map((w) => (
                    <option key={w} value={w}>
                      {w}{WARD_LOCALITY_NAMES[w] ? ` (${WARD_LOCALITY_NAMES[w]})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Landmark / Street Address</label>
                <input
                  type="text"
                  required
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Ghanta Ghar, Clock Tower Market"
                  className="w-full rounded-xl border border-slate-300 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Wet waste dumped on pavement overflowing into drain..."
                className="w-full rounded-xl border border-slate-300 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-600">Selected GPS Location:</span>
              <span className="font-mono font-bold text-slate-800">
                {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
              </span>
            </div>

            {photoPreview && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-900">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full shadow"
                >
                  &times;
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 text-sm"
            >
              {submitting ? (
                <span>Filing Complaint via AI...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Complaint</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Complaint History */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200">
          <h2 className="font-extrabold text-xl text-slate-900 mb-4 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>My Complaint History ({complaints.length})</span>
          </h2>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {complaints.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No complaints filed yet. Report waste issues to help keep your ward clean!
              </div>
            ) : (
              complaints.map((c) => (
                <div key={c.id || c._id} className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all bg-white shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-sm text-slate-900">#{c.id || c._id}</span>
                      <p className="text-xs text-slate-600 font-medium">📍 {c.landmark} ({c.ward_no})</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      c.status === 'Assigned' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {c.ai_classification && (
                    <div className="p-2 bg-slate-50 rounded-xl text-xs border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Category: <strong>{c.ai_classification.primary_category}</strong></span>
                      <span className="font-bold text-emerald-700">{c.ai_classification.bin_color} Bin</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex justify-between pt-1">
                    <span>Filed on: {new Date(c.created_at).toLocaleDateString()}</span>
                    {c.assigned_to && <span>Assigned to: {c.assigned_to.assigned_staff_name}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handlePhotoCapture}
      />
    </div>
  );
};

export default CitizenDashboard;