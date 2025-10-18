import * as functions from 'firebase-functions';

interface SalesData {
  departmentName: string;
  date: string;
  numberOfSales: number;
}

interface AggregatedData {
  [department: string]: number;
}

export const uploadCSVSimple = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // For simplicity, expecting JSON data instead of file upload
    // Frontend can read CSV file and send as JSON
    const csvData: SalesData[] = req.body.data;
    
    if (!csvData || !Array.isArray(csvData)) {
      res.status(400).json({ error: 'Invalid data format. Expected array of sales data.' });
      return;
    }

    // Process the data
    const aggregatedData = processData(csvData);
    
    // Generate result CSV string
    const resultCSV = generateResultCSV(aggregatedData);
    
    // Return the CSV data directly
    res.set('Content-Type', 'application/json');
    res.status(200).json({
      message: 'File processed successfully',
      csvData: resultCSV,
      downloadReady: true
    });
    
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ error: 'Error processing data' });
  }
});

function processData(data: SalesData[]): AggregatedData {
  const aggregatedData: AggregatedData = {};
  
  for (const row of data) {
    const department = row.departmentName;
    const sales = row.numberOfSales;
    
    if (department && !isNaN(sales)) {
      aggregatedData[department] = (aggregatedData[department] || 0) + sales;
    }
  }
  
  return aggregatedData;
}

function generateResultCSV(data: AggregatedData): string {
  let csv = 'Department Name,Total Number of Sales\n';
  
  for (const [department, totalSales] of Object.entries(data)) {
    csv += `"${department}",${totalSales}\n`;
  }
  
  return csv;
}