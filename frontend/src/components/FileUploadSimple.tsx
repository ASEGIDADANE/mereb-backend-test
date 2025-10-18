'use client';

import { useState } from 'react';

interface SalesData {
  departmentName: string;
  date: string;
  numberOfSales: number;
}

interface UploadResult {
  message: string;
  csvData: string;
  downloadReady: boolean;
}

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simple CSV parser
  const parseCSV = (csvText: string): SalesData[] => {
    console.log('Parsing CSV, length:', csvText.length);
    const lines = csvText.trim().split('\n');
    console.log('Total lines:', lines.length);
    const data: SalesData[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (line) {
        const values = line.split(',');
        if (values.length >= 3) {
          const department = values[0].trim().replace(/"/g, '');
          const date = values[1].trim();
          const sales = parseInt(values[2].trim(), 10);
          
          if (department && !isNaN(sales)) {
            data.push({
              departmentName: department,
              date: date,
              numberOfSales: sales
            });
            console.log('Added:', department, sales);
          }
        }
      }
    }
    
    console.log('Parsed data:', data);
    return data;
  };

  // Process data locally
  const processData = (data: SalesData[]) => {
    console.log('Processing data:', data);
    const totals: { [key: string]: number } = {};
    
    data.forEach(row => {
      const dept = row.departmentName;
      const sales = row.numberOfSales;
      totals[dept] = (totals[dept] || 0) + sales;
    });
    
    console.log('Totals:', totals);
    return totals;
  };

  // Generate CSV
  const generateCSV = (data: { [key: string]: number }): string => {
    let csv = 'Department Name,Total Number of Sales\n';
    
    Object.entries(data).forEach(([dept, total]) => {
      csv += `${dept},${total}\n`;
    });
    
    console.log('Generated CSV:', csv);
    return csv;
  };

  // Test with hardcoded data
  const handleTest = () => {
    console.log('=== TESTING WITH SAMPLE DATA ===');
    
    const testData: SalesData[] = [
      { departmentName: 'Electronics', date: '2023-08-01', numberOfSales: 100 },
      { departmentName: 'Clothing', date: '2023-08-01', numberOfSales: 200 },
      { departmentName: 'Electronics', date: '2023-08-02', numberOfSales: 150 },
      { departmentName: 'Clothing', date: '2023-08-02', numberOfSales: 50 },
      { departmentName: 'Furniture', date: '2023-08-01', numberOfSales: 75 },
      { departmentName: 'Electronics', date: '2023-08-03', numberOfSales: 50 }
    ];

    const aggregated = processData(testData);
    const csv = generateCSV(aggregated);
    
    setResult({
      message: 'Test completed successfully!',
      csvData: csv,
      downloadReady: true
    });
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      console.log('=== PROCESSING FILE ===');
      console.log('File name:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      
      // Try multiple ways to read the file
      let text = '';
      
      try {
        text = await file.text();
        console.log('Method 1 - file.text() result length:', text.length);
      } catch (e) {
        console.log('Method 1 failed, trying FileReader...');
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.onerror = reject;
          reader.readAsText(file);
        });
        console.log('Method 2 - FileReader result length:', text.length);
      }
      
      console.log('File content preview:', text.substring(0, 200));
      
      if (!text.trim()) {
        throw new Error('File appears to be empty');
      }
      
      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        throw new Error('No valid data rows found in CSV');
      }
      
      const aggregated = processData(parsed);
      const csv = generateCSV(aggregated);
      
      setResult({
        message: `File processed successfully! Found ${parsed.length} data rows.`,
        csvData: csv,
        downloadReady: true
      });
    } catch (err) {
      console.error('Error:', err);
      setError(`Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (result?.csvData) {
      const blob = new Blob([result.csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'processed_sales.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Sales Data Aggregator
      </h1>
      
      <div className="space-y-6">
        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <div className="space-y-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            
            <div>
              <label htmlFor="csv-file" className="cursor-pointer">
                <span className="text-lg font-medium text-gray-700 block mb-2">
                  Upload CSV File
                </span>
                <div className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose CSV File
                </div>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>
            
            {file && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  ✓ Selected: {file.name}
                </p>
                <p className="text-xs text-green-600">
                  Size: {file.size} bytes
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleTest}
            className="flex items-center justify-center px-6 py-4 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            🧪 Test with Sample Data
          </button>
          
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className={`flex items-center justify-center px-6 py-4 font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              !file || isUploading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
            }`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                </svg>
                Process CSV File
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-4">
              <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold text-green-800">✅ {result.message}</h3>
            </div>
            
            {/* CSV Preview */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-4 shadow-inner">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <strong className="text-gray-800">Generated CSV Content:</strong>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 p-3 rounded border overflow-x-auto">
{result.csvData}
              </pre>
            </div>
            
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              📥 Download Processed CSV
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="font-bold text-blue-800 mb-2">📋 Instructions:</h4>
          <p className="text-sm text-blue-700 mb-2">
            1. Click "Test with Sample Data" to verify the app works
          </p>
          <p className="text-sm text-blue-700 mb-2">
            2. Upload a CSV with format: Department Name, Date, Number of Sales
          </p>
          <p className="text-sm text-blue-700">
            3. Open browser console (F12) to see processing logs
          </p>
        </div>
      </div>
    </div>
  );
}