import React, { useState } from 'react';

const API_BASE = 'https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net'; // TODO: Replace with your deployed functions base URL

export default function FileUploadJob() {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [resultPreview, setResultPreview] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('');
      setResultPreview('');
      setDownloadUrl('');
      setJobId('');
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setProcessing(true);
    setStatus('Uploading file...');
    const formData = new FormData();
    formData.append('csv', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      setJobId(data.jobId);
      setDownloadUrl(data.downloadUrl);
      setStatus('File uploaded. Processing started...');
      pollStatus(data.statusUrl);
    } catch (err: any) {
      setStatus('Upload failed: ' + (err.message || 'Unknown error'));
      setProcessing(false);
    }
  };

  const pollStatus = async (statusUrl: string) => {
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch(statusUrl);
        const data = await res.json();
        const jobStatus = data.status;
        setStatus(`Job status: ${jobStatus}`);
        if (jobStatus === 'completed' && data.result?.csvContent) {
          setResultPreview(data.result.csvContent);
          setProcessing(false);
        } else if (jobStatus === 'error') {
          setStatus('Processing failed.');
          setProcessing(false);
        } else if (attempts < 30) {
          attempts++;
          setTimeout(poll, 1000);
        } else {
          setStatus('Processing timed out.');
          setProcessing(false);
        }
      } catch (err: any) {
        setStatus('Status check failed: ' + (err.message || 'Unknown error'));
        setProcessing(false);
      }
    };
    poll();
  };

  const downloadResult = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Sales CSV Processor</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />
      <button
        onClick={uploadFile}
        disabled={!file || processing}
        className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
      >
        {processing ? 'Processing...' : 'Upload & Process'}
      </button>
      {status && <div className="mb-2 text-gray-700">{status}</div>}
      {resultPreview && (
        <div className="mb-4">
          <h3 className="font-semibold">Result Preview:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm">{resultPreview}</pre>
          <button
            onClick={downloadResult}
            className="px-4 py-2 bg-green-600 text-white rounded mt-2"
          >
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
}
