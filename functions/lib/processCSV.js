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
exports.processCSV = void 0;
const functions = __importStar(require("firebase-functions"));
exports.processCSV = functions.storage.object().onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const fileName = filePath === null || filePath === void 0 ? void 0 : filePath.split('/').pop();
    // Only process CSV files
    if (!(fileName === null || fileName === void 0 ? void 0 : fileName.endsWith('.csv'))) {
        console.log('Not a CSV file, skipping...');
        return null;
    }
    // Skip if it's already a processed file
    if (fileName.startsWith('processed_')) {
        console.log('Already processed file, skipping...');
        return null;
    }
    console.log(`Processing file: ${fileName}`);
    // Here you could add additional processing logic if needed
    // For now, the main processing is handled in uploadCSV.ts
    return null;
});
//# sourceMappingURL=processCSV.js.map