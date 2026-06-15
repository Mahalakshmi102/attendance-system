import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../api/adminApi';

const SettingsManage = () => {
  const [settings, setSettings] = useState({
    automatedBackups: true,
    strictGeofencing: false,
    strictDeviceBinding: true,
    attendanceEditWindowHours: 24,
    medicalLeavePolicy: 'Exclude',
    casualLeavePolicy: 'Count as Absent',
    attendanceThreshold: 75,
    academicYear: '2025-2026',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await getSettings();
      if (res.data) {
        setSettings({
          automatedBackups: res.data.automatedBackups,
          strictGeofencing: res.data.strictGeofencing,
          strictDeviceBinding: res.data.strictDeviceBinding,
          attendanceEditWindowHours: res.data.attendanceEditWindowHours || 24,
          medicalLeavePolicy: res.data.medicalLeavePolicy || 'Exclude',
          casualLeavePolicy: res.data.casualLeavePolicy || 'Count as Absent',
          attendanceThreshold: res.data.attendanceThreshold || 75,
          academicYear: res.data.academicYear || '2025-2026',
        });
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500 p-8 text-center animate-pulse">Loading settings...</div>;

  return (
    <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-slate-800 border-b pb-4 mb-6">System Settings & Controls</h3>
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-700">Automated Daily Backups</h4>
            <p className="text-sm text-slate-500 font-medium">Sync database to secure cloud storage automatically.</p>
          </div>
          <button 
            className={`w-12 h-6 rounded-full relative transition-colors ${settings.automatedBackups ? 'bg-indigo-500' : 'bg-slate-200'}`} 
            onClick={() => toggleSetting('automatedBackups')}
            disabled={saving}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${settings.automatedBackups ? 'right-1' : 'left-1'}`}></div>
          </button>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-700">Strict Geofencing Validation</h4>
            <p className="text-sm text-slate-500 font-medium">Require students to be strictly within campus bounds.</p>
          </div>
          <button 
            className={`w-12 h-6 rounded-full relative transition-colors ${settings.strictGeofencing ? 'bg-indigo-500' : 'bg-slate-200'}`} 
            onClick={() => toggleSetting('strictGeofencing')}
            disabled={saving}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${settings.strictGeofencing ? 'right-1' : 'left-1'}`}></div>
          </button>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-700">Strict Device Binding</h4>
            <p className="text-sm text-slate-500 font-medium">Lock one student account to a single device MAC address.</p>
          </div>
          <button 
            className={`w-12 h-6 rounded-full relative transition-colors ${settings.strictDeviceBinding ? 'bg-indigo-500' : 'bg-slate-200'}`} 
            onClick={() => toggleSetting('strictDeviceBinding')}
            disabled={saving}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${settings.strictDeviceBinding ? 'right-1' : 'left-1'}`}></div>
          </button>
        </div>

        <div className="flex justify-between items-center border-t border-slate-100 pt-6">
          <div>
            <h4 className="font-bold text-slate-700">Attendance Edit Window (Hours)</h4>
            <p className="text-sm text-slate-500 font-medium">Configure the time limit within which faculty can directly modify submitted attendance logs.</p>
          </div>
          <input 
            type="number"
            min="1"
            max="168"
            className="w-24 border border-slate-200 rounded-xl p-2.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 bg-slate-50/50"
            value={settings.attendanceEditWindowHours || 24}
            onChange={e => setSettings(prev => ({ ...prev, attendanceEditWindowHours: Math.max(1, Number(e.target.value)) }))}
            disabled={saving}
          />
        </div>

        <div className="flex justify-between items-center border-t border-slate-100 pt-6">
          <div>
            <h4 className="font-bold text-slate-700">Medical Leave (ML) Policy</h4>
            <p className="text-sm text-slate-500 font-medium">Define how approved Medical Leave entries affect attendance calculation.</p>
          </div>
          <select
            className="w-44 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-700 outline-none focus:border-indigo-500 bg-slate-50/50 text-sm"
            value={settings.medicalLeavePolicy}
            onChange={e => setSettings(prev => ({ ...prev, medicalLeavePolicy: e.target.value }))}
            disabled={saving}
          >
            <option value="Exclude">Exclude from Calculations</option>
            <option value="Count as Present">Count as Present</option>
            <option value="Count as Absent">Count as Absent</option>
          </select>
        </div>

        <div className="flex justify-between items-center border-t border-slate-100 pt-6">
          <div>
            <h4 className="font-bold text-slate-700">Casual Leave (CL) Policy</h4>
            <p className="text-sm text-slate-500 font-medium">Define how approved Casual Leave entries affect attendance calculation.</p>
          </div>
          <select
            className="w-44 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-700 outline-none focus:border-indigo-500 bg-slate-50/50 text-sm"
            value={settings.casualLeavePolicy}
            onChange={e => setSettings(prev => ({ ...prev, casualLeavePolicy: e.target.value }))}
            disabled={saving}
          >
            <option value="Exclude">Exclude from Calculations</option>
            <option value="Count as Present">Count as Present</option>
            <option value="Count as Absent">Count as Absent</option>
          </select>
        </div>

        <div className="flex justify-between items-center border-t border-slate-100 pt-6">
          <div>
            <h4 className="font-bold text-slate-700">Attendance Defaulter Threshold (%)</h4>
            <p className="text-sm text-slate-500 font-medium">Configure the minimum required attendance percentage for exam eligibility (defaulter list threshold).</p>
          </div>
          <input 
            type="number"
            min="10"
            max="100"
            className="w-24 border border-slate-200 rounded-xl p-2.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 bg-slate-50/50"
            value={settings.attendanceThreshold || 75}
            onChange={e => setSettings(prev => ({ ...prev, attendanceThreshold: Math.max(10, Math.min(100, Number(e.target.value))) }))}
            disabled={saving}
          />
        </div>

        <div className="flex justify-between items-center border-t border-slate-100 pt-6">
          <div>
            <h4 className="font-bold text-slate-700">Current Academic Year</h4>
            <p className="text-sm text-slate-500 font-medium">Manage the active academic calendar year for tracking reports.</p>
          </div>
          <input 
            type="text"
            className="w-44 border border-slate-200 rounded-xl p-2.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 bg-slate-50/50 text-sm"
            value={settings.academicYear || '2025-2026'}
            onChange={e => setSettings(prev => ({ ...prev, academicYear: e.target.value }))}
            disabled={saving}
          />
        </div>
      </div>

      <div className="mt-8 pt-8 border-t flex justify-end">
        <button 
          className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl shadow-sm hover:bg-slate-900 transition disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Configurations'}
        </button>
      </div>
    </div>
  );
};

export default SettingsManage;
