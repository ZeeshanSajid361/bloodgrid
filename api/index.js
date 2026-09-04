'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { connectDB } = require('../server/src/config/db');
const app = require('../server/src/app');

let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    return app(req, res);
  } catch (error) {
    console.error('[Vercel Serverless Error]', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};
