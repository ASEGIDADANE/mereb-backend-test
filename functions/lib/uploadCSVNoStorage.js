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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCSVNoStorage = void 0;
const functions = __importStar(require("firebase-functions"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
const busboy_1 = __importDefault(require("busboy"));
exports.uploadCSVNoStorage = functions.https.onRequest(async (req, res) => {
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
        const bb = new busboy_1.default({ headers: req.headers });
        let fileBuffer = null;
        let fileName = '';
        bb.on('file', (fieldname, file, info) => {
            fileName = info.filename;
            const chunks = [];
            file.on('data', (chunk) => {
                chunks.push(chunk);
            });
            file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
            });
        });
        bb.on('finish', async () => {
            if (!fileBuffer) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }
            try {
                // Process the CSV data
                const aggregatedData = await processCSVData(fileBuffer);
                // Generate result CSV
                const resultCSV = generateResultCSV(aggregatedData);
                // Return the CSV data directly in the response
                res.set('Content-Type', 'text/csv');
                res.set('Content-Disposition', `attachment; filename="processed_${fileName}"`);
                res.status(200).send(resultCSV);
            }
            catch (error) {
                console.error('Error processing file:', error);
                res.status(500).json({ error: 'Error processing file' });
            }
        });
        bb.end(req.body);
    }
    catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});
async function processCSVData(buffer) {
    return new Promise((resolve, reject) => {
        const aggregatedData = {};
        const stream = stream_1.Readable.from(buffer.toString());
        stream
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            const department = row['Department Name'];
            const sales = parseInt(row['Number of Sales'], 10);
            if (department && !isNaN(sales)) {
                aggregatedData[department] = (aggregatedData[department] || 0) + sales;
            }
        })
            .on('end', () => {
            resolve(aggregatedData);
        })
            .on('error', (error) => {
            reject(error);
        });
    });
}
function generateResultCSV(data) {
    let csv = 'Department Name,Total Number of Sales\n';
    for (const [department, totalSales] of Object.entries(data)) {
        csv += `${department},${totalSales}\n`;
    }
    return csv;
}
//# sourceMappingURL=uploadCSVNoStorage.js.map