import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, withAuthHeader } from '../../api/http';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function ApprovalsManage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(apiUrl('/api/requests'), {
        headers: withAuthHeader()
      });
      setRequests(response.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId, status) => {
    const remarks = prompt(`Enter remarks for ${status.toLowerCase()} this request:`);
    if (remarks === null) return; // User cancelled

    try {
      await axios.put(apiUrl(`/api/requests/${requestId}/review`), {
        status,
        reviewRemarks: remarks
      }, {
        headers: withAuthHeader()
      });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request');
    }
  };

  if (loading) return <div className="text-gray-500 p-8 text-center animate-pulse">Loading requests...</div>;

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const pastRequests = requests.filter(r => r.status !== 'Pending');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-amber-50/50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" /> Pending Approvals ({pendingRequests.length})
          </h2>
          <p className="text-sm text-slate-500 mt-1">Review correction requests from faculty for locked attendance and marks.</p>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {pendingRequests.length === 0 ? (
             <div className="p-8 text-center text-slate-500 font-medium">No pending requests. You're all caught up!</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Requested By</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Changes</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingRequests.map(req => (
                  <tr key={req._id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{req.requestedBy?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.targetModel === 'Leave' 
                          ? 'bg-orange-100 text-orange-700' 
                          : req.targetModel === 'Attendance' 
                            ? 'bg-indigo-100 text-indigo-700' 
                            : req.targetModel === 'PasswordReset'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {req.targetModel}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="p-4 text-slate-700">
                       <div className="text-xs">
                          {req.targetModel === 'Leave' ? (
                    <div className="text-xs font-semibold text-slate-700 bg-orange-50/50 p-2.5 rounded-lg border border-orange-100/50 inline-block">
                      <p className="text-orange-800 font-bold uppercase tracking-wide text-[9px] mb-0.5">{req.newValue?.leaveType || 'General'} Leave</p>
                      <p className="text-[10px] text-slate-600">
                        {req.newValue?.startDate ? new Date(req.newValue.startDate).toLocaleDateString() : 'N/A'} to{' '}
                        {req.newValue?.endDate ? new Date(req.newValue.endDate).toLocaleDateString() : 'N/A'}
                      </p>
                      {req.newValue?.proofImage && (
                        <div className="mt-2">
                          <p className="text-[9px] uppercase font-bold text-slate-400">Attached Proof:</p>
                          <a href={req.newValue.proofImage} target="_blank" rel="noreferrer" className="inline-block mt-1">
                            <img 
                              src={req.newValue.proofImage} 
                              alt="OD Proof" 
                              className="max-h-24 max-w-full rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-85 transition" 
                            />
                          </a>
                        </div>
                      )}
                    </div>
                          ) : req.targetModel === 'Attendance' ? (
                            <span><span className="line-through text-red-400">{req.oldValue}</span> <span className="text-slate-400">→</span> <span className="text-emerald-600 font-bold">{req.newValue}</span></span>
                          ) : req.targetModel === 'PasswordReset' ? (
                            <span className="font-extrabold text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200">Reset Password to DOB</span>
                          ) : (
                            <span>Old Total: {req.oldValue?.total || 0} <span className="text-slate-400">→</span> New Total: {req.newValue?.total || (Number(req.newValue?.internal) + Number(req.newValue?.external))}</span>
                          )}
                       </div>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleReview(req._id, 'Approved')} className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold transition text-xs">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleReview(req._id, 'Rejected')} className="inline-flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg font-semibold transition text-xs">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Past Approvals Log</h2>
        </div>
        <div className="p-0 overflow-x-auto">
          {pastRequests.length === 0 ? (
             <div className="p-6 text-center text-slate-500 font-medium">No past requests.</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Requested By</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Admin Remarks</th>
                  <th className="p-4">Date Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pastRequests.map(req => (
                  <tr key={req._id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-medium text-slate-700">{req.requestedBy?.name || 'Unknown'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.targetModel === 'Leave' 
                          ? 'bg-orange-100 text-orange-700' 
                          : req.targetModel === 'Attendance' 
                            ? 'bg-indigo-100 text-indigo-700' 
                            : req.targetModel === 'PasswordReset'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {req.targetModel}
                      </span>
                      {req.targetModel === 'Leave' && req.newValue?.proofImage && (
                        <div className="mt-1.5">
                          <a href={req.newValue.proofImage} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline">
                            View Proof Image
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                       <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {req.status === 'Approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {req.status}
                       </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate" title={req.reviewRemarks}>{req.reviewRemarks || '-'}</td>
                    <td className="p-4 text-slate-500 text-xs">{new Date(req.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
