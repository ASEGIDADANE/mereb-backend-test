import * as admin from 'firebase-admin';
import { uploadCSVSimple } from './uploadCSVSimple';

// Initialize Firebase Admin
admin.initializeApp();

// Export Cloud Functions
export const upload = uploadCSVSimple;