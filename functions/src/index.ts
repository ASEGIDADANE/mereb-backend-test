import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onValueWritten } from 'firebase-functions/v2/database';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin
admin.initializeApp();

interface CSVRow {
  departmentName: string;
  date: string;
  numberOfSales: number;
}

interface ProcessedResult {
  departmentName: string;
  totalSales: number;
}

// HTTP POST endpoint for CSV uploads (/upload)
export const upload = onRequest({ 
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60
}, async (req, res) => {
  console.log('Upload function called');
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Handle different content types
    let csvData = '';
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Handle multipart form data (file upload)
      csvData = req.body || '';
    } else if (req.headers['content-type']?.includes('text/csv')) {
      // Handle direct CSV upload
      csvData = req.body || '';
    } else {
      // Handle JSON payload with CSV data
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      csvData = body.csvData || body.data || '';
    }

    if (!csvData || csvData.length < 10) {
      throw new Error('No CSV data received or data too short');
    }

    console.log(`CSV data length: ${csvData.length}`);
    
    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store CSV data in Realtime Database for processing
    const db = getDatabase();
    await db.ref(`jobs/${jobId}`).set({
      csvData: csvData,
      timestamp: Date.now(),
      status: 'pending'
    });

    console.log(`Job created: ${jobId}`);

    // Get the function URL base
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    
    // Return job ID and download URL
    res.status(200).json({
      success: true,
      jobId: jobId,
      message: 'CSV uploaded successfully, processing started',
      downloadUrl: `${baseUrl}/download?jobId=${jobId}`,
      statusUrl: `${baseUrl}/status?jobId=${jobId}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

// Database trigger to process uploaded CSV
export const processCSVJob = onValueWritten('/jobs/{jobId}', async (event) => {
  const jobId = event.params.jobId;
  const jobData = event.data.after.val();
  
  // Only process new jobs (status: pending)
  if (!jobData || jobData.status !== 'pending') {
    return;
  }

  console.log(`Processing CSV for job: ${jobId}`);

  try {
    // Update status to processing
    const db = getDatabase();
    await db.ref(`jobs/${jobId}`).update({
      status: 'processing',
      startTime: Date.now()
    });

    // Parse and aggregate CSV data
    const csvRows = parseCSV(jobData.csvData);
    const aggregated = aggregateCSVData(csvRows);
    
    // Generate result CSV
    const resultCSV = generateResultCSV(aggregated);
    
    console.log(`Processed ${csvRows.length} rows into ${aggregated.length} departments`);

    // Store results
    await db.ref(`results/${jobId}`).set({
      status: 'completed',
      data: aggregated,
      csvContent: resultCSV,
      downloadReady: true,
      timestamp: Date.now(),
      originalRowCount: csvRows.length,
      processedDepartments: aggregated.length,
      filename: `processed_sales_${jobId}.csv`
    });

    // Update job status
    await db.ref(`jobs/${jobId}`).update({
      status: 'completed',
      completedTime: Date.now(),
      resultCount: aggregated.length
    });

    console.log(`Job completed: ${jobId}`);

  } catch (error) {
    console.error('Processing error for job:', jobId, error);
    
    // Store error result
    const db = getDatabase();
    await db.ref(`results/${jobId}`).set({
      status: 'error',
      error: error instanceof Error ? error.message : 'Processing failed',
      timestamp: Date.now()
    });

    await db.ref(`jobs/${jobId}`).update({
      status: 'error',
      errorTime: Date.now(),
      errorMessage: error instanceof Error ? error.message : 'Processing failed'
    });
  }
});

// Download endpoint (replaces Firebase Storage signed URLs)
export const download = onRequest({ cors: true }, async (req, res) => {
  const jobId = req.query.jobId as string;
  
  if (!jobId) {
    res.status(400).send('Missing jobId parameter');
    return;
  }

  try {
    const db = getDatabase();
    const resultSnapshot = await db.ref(`results/${jobId}`).once('value');
    const result = resultSnapshot.val();

    if (!result || result.status !== 'completed') {
      res.status(404).send('Result not found or not ready');
      return;
    }

    // Return CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csvContent);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Download failed');
  }
});

// Status endpoint for job tracking
export const status = onRequest({ cors: true }, async (req, res) => {
  const jobId = req.query.jobId as string;
  
  if (!jobId) {
    res.status(400).json({ error: 'Missing jobId parameter' });
    return;
  }

  try {
    const db = getDatabase();
    const jobSnapshot = await db.ref(`jobs/${jobId}`).once('value');
    const resultSnapshot = await db.ref(`results/${jobId}`).once('value');
    
    const job = jobSnapshot.val();
    const result = resultSnapshot.val();

    res.status(200).json({
      jobId: jobId,
      status: job?.status || 'unknown',
      job: job || null,
      result: result || null,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

// Helper Functions for CSV Processing
function parseCSV(csvData: string): CSVRow[] {
  console.log('Parsing CSV data...');
  const lines = csvData.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least header and one data row');
  }

  const rows: CSVRow[] = [];
  
  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    
    if (values.length >= 3) {
      const numberOfSales = parseInt(values[2]);
      if (!isNaN(numberOfSales) && values[0]) {
        rows.push({
          departmentName: values[0],
          date: values[1],
          numberOfSales: numberOfSales
        });
      }
    }
  }
  
  console.log(`Parsed ${rows.length} valid rows`);
  return rows;
}

function aggregateCSVData(csvRows: CSVRow[]): ProcessedResult[] {
  console.log('Aggregating CSV data...');
  const totals: { [key: string]: number } = {};
  
  // O(n) time complexity - single pass through data
  csvRows.forEach(row => {
    const dept = row.departmentName.trim();
    totals[dept] = (totals[dept] || 0) + row.numberOfSales;
  });
  
  // Convert to array and sort (O(k log k) where k = number of departments)
  const results = Object.entries(totals)
    .map(([dept, total]) => ({
      departmentName: dept,
      totalSales: total
    }))
    .sort((a, b) => b.totalSales - a.totalSales);
  
  console.log(`Aggregated into ${results.length} departments`);
  return results;
}

function generateResultCSV(results: ProcessedResult[]): string {
  const header = 'Department Name,Total Number of Sales';
  const rows = results.map(row => `"${row.departmentName}",${row.totalSales}`);
  return [header, ...rows].join('\n');
}