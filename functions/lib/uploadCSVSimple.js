"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCSVSimple = void 0;
const functions = __importStar(require("firebase-functions"));
exports.uploadCSVSimple = functions.https.onRequest(async (req, res) => {
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
        const csvData = req.body.data;
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
    }
    catch (error) {
        console.error('Error processing data:', error);
        res.status(500).json({ error: 'Error processing data' });
    }
});
function processData(data) {
    const aggregatedData = {};
    for (const row of data) {
        const department = row.departmentName;
        const sales = row.numberOfSales;
        if (department && !isNaN(sales)) {
            aggregatedData[department] = (aggregatedData[department] || 0) + sales;
        }
    }
    return aggregatedData;
}
function generateResultCSV(data) {
    let csv = 'Department Name,Total Number of Sales\n';
    for (const [department, totalSales] of Object.entries(data)) {
        csv += `"${department}",${totalSales}\n`;
    }
    return csv;
}
//# sourceMappingURL=uploadCSVSimple.js.map