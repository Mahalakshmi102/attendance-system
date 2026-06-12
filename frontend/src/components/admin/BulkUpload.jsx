import { useState } from 'react';
import { bulkUpload } from '../../api/adminApi';
import { UploadCloud, CheckCircle, AlertCircle, FileSpreadsheet, X, Loader2 } from 'lucide-react';

export default function BulkUpload({ type, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
      setError(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      setError(true);
      return;
    }

    setUploading(true);
    setMessage('Uploading...');
    setError(false);

    try {
      const res = await bulkUpload(type, file);
      setMessage(res.data.message);
      setError(false);
      setFile(null);
      const inputEl = document.getElementById(`upload-${type}`);
      if (inputEl) inputEl.value = ''; // Reset input
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error uploading file.');
      setError(true);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    const inputEl = document.getElementById(`upload-${type}`);
    if (inputEl) inputEl.value = '';
    setMessage('');
    setError(false);
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-500 shrink-0" />
            Bulk Upload via Excel/CSV
          </h3>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Upload a file to automatically populate {type} data.</p>
        </div>

        <div className="w-full md:w-auto">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            id={`upload-${type}`}
            onChange={handleFileChange}
            className="hidden"
          />

          {!file ? (
            <div 
              onClick={() => document.getElementById(`upload-${type}`).click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl p-5 cursor-pointer hover:bg-indigo-50/20 transition text-center w-full md:w-80 group active:scale-[0.98]"
            >
              <UploadCloud className="w-7 h-7 text-indigo-500 mb-1.5 group-hover:scale-110 transition shrink-0" />
              <span className="text-xs font-extrabold text-indigo-600">Choose Excel/CSV File</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Drag & drop or tap to browse</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 w-full md:w-80">
              <div className="flex items-center justify-between border border-indigo-100 rounded-xl p-3 bg-indigo-50/30">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="flex flex-col overflow-hidden text-left">
                    <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={removeFile}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition shrink-0"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <button 
                onClick={handleUpload} 
                disabled={uploading}
                className={`w-full py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-sm transition flex items-center justify-center gap-2 ${
                  uploading 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 shrink-0" />
                    <span>Upload File</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 ${
          error ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }`}>
          <div className="flex items-center gap-2">
            {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            <span>{message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setMessage('')} 
            className={`p-0.5 rounded-full hover:bg-black/5 transition shrink-0 ${
              error ? 'text-rose-500 hover:text-rose-700' : 'text-emerald-500 hover:text-emerald-700'
            }`}
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
