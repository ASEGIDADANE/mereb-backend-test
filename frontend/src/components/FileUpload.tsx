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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const parseCSV = (csvText: string): SalesData[] => {
    console.log('Starting CSV parse, text length:', csvText.length);
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    console.log('Lines found:', lines.length, lines);
    const data: SalesData[] = [];

    // Skip header row (index 0) and process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log(`Processing line ${i}:`, line);
      if (line) {
        // Handle CSV with or without quotes
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        console.log('Split values:', values);
        if (values.length >= 3) {
          const salesValue = parseInt(values[2], 10);
          console.log('Sales value parsed:', salesValue);
          if (!isNaN(salesValue)) {
            const rowData = {
              departmentName: values[0],
              date: values[1],
              numberOfSales: salesValue
            };
            console.log('Adding row:', rowData);
            data.push(rowData);
          }
        }
      }
    }

    console.log('Final parsed CSV data:', data); // Debug log
    return data;
  };

  const processDataLocally = (data: SalesData[]) => {
    const aggregated: { [department: string]: number } = {};
    
    for (const row of data) {
      const department = row.departmentName;
      const sales = row.numberOfSales;
      
      if (department && !isNaN(sales)) {
        aggregated[department] = (aggregated[department] || 0) + sales;
      }
    }
    
    console.log('Aggregated data:', aggregated); // Debug log
    return aggregated;
  };

  const generateCSVLocally = (data: { [department: string]: number }): string => {
    let csv = 'Department Name,Total Number of Sales\n';
    
    // Check if we have any data
    if (Object.keys(data).length === 0) {
      console.warn('No data to generate CSV with');
      return csv;
    }
    
    for (const [department, totalSales] of Object.entries(data)) {
      csv += `${department},${totalSales}\n`;
    }
    
    console.log('Generated CSV:', csv); // Debug log
    console.log('Data entries:', Object.entries(data)); // Debug log
    return csv;
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      // Read the CSV file
      const fileText = await file.text();
      console.log('Raw file text:', fileText); // Debug log
      
      const parsedData = parseCSV(fileText);
      console.log('Parsed data length:', parsedData.length); // Debug log

      // Process data locally since Firebase Cloud Functions require Blaze plan
      const aggregatedData = processDataLocally(parsedData);
      const resultCSV = generateCSVLocally(aggregatedData);
      
      // Simulate API response
      const response = {
        ok: true,
        json: async () => ({
          message: 'File processed successfully (locally)',
          csvData: resultCSV,
          downloadReady: true
        })
      };

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data: UploadResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (result?.csvData) {
      const blob = new Blob([result.csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_sales_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const handleTestData = () => {
    console.log('Testing with hardcoded data');
    
    // Test data
    const testData: SalesData[] = [
      { departmentName: 'Electronics', date: '2023-08-01', numberOfSales: 100 },
      { departmentName: 'Clothing', date: '2023-08-01', numberOfSales: 200 },
      { departmentName: 'Electronics', date: '2023-08-02', numberOfSales: 150 },
      { departmentName: 'Clothing', date: '2023-08-02', numberOfSales: 50 },
      { departmentName: 'Furniture', date: '2023-08-01', numberOfSales: 75 },
      { departmentName: 'Electronics', date: '2023-08-03', numberOfSales: 50 },
    ];

    console.log('Test data:', testData);
    
    // Process the test data
    const aggregatedData = processDataLocally(testData);
    const resultCSV = generateCSVLocally(aggregatedData);
    
    // Set the result
    setResult({
      message: 'Test data processed successfully',
      csvData: resultCSV,
      downloadReady: true
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Sales Data Aggregator
      </h1>
      
      <div className="space-y-6">
        {/* File Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Upload a CSV file with sales data
                </span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <div className="mt-2">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Select File
                  </button>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Selected File Display */}
        {file && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Selected file:</p>
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">Size: {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            !file || isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Upload and Process'
          )}
        </button>

        {/* Test Button */}
        <button
          onClick={handleTestData}
          className="w-full py-2 px-4 rounded-lg font-medium text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          🧪 Test with Sample Data
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-800 mb-2">Processing Complete!</h3>
            <p className="text-green-700 mb-2">{result.message}</p>
            
            {/* Show preview of CSV content */}
            <div className="bg-white border rounded p-2 mb-4 text-xs font-mono">
              <strong>CSV Preview:</strong>
              <pre className="whitespace-pre-wrap">{result.csvData?.substring(0, 200)}</pre>
              {result.csvData && result.csvData.length > 200 && <span>...</span>}
            </div>
            
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Result
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Expected CSV Format:</h4>
        <div className="text-sm text-blue-700">
          <p className="mb-1">Department Name, Date, Number of Sales</p>
          <p className="mb-1">Electronics, 2023-08-01, 100</p>
          <p>Clothing, 2023-08-01, 200</p>
        </div>
      </div>

      {/* Note about local processing */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">� Demo Mode:</h4>
        <p className="text-sm text-blue-700">
          Currently running in local demo mode (no server deployment required).
          Data processing happens in your browser for immediate testing.
        </p>
      </div>
    </div>
  );
}