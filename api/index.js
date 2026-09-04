'use strict';

const { connectDB } = require('../server/src/config/db');
const app = require('../server/src/app');

let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (!isConnected) {
      console.log('[Vercel Serverless] Connecting to MongoDB Atlas...');
      await connectDB();
      isConnected = true;
    }
    return app(req, res);
  } catch (error) {
    console.error('[Vercel Serverless Error]', error);
    return res.status(500).json({ success: false, message: 'Serverless execution error', error: error.message });
  }
};
