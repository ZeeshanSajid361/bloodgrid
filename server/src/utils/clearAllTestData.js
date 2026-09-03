require('dotenv').config();
const mongoose = require('mongoose');
const { User }            = require('../models/User');
const { DonorProfile }    = require('../models/DonorProfile');
const { Organization }   = require('../models/Organization');
const { Request }         = require('../models/Request');
const { DonationToken }   = require('../models/DonationToken');
const { Notification }    = require('../models/Notification');
const { Discrepancy }     = require('../models/Discrepancy');
const { Drive }           = require('../models/Drive');

async function clearTestData() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('[Error] MONGO_URI missing in .env');
      process.exit(1);
    }

    console.log('[Info] Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Info] Successfully connected to MongoDB Atlas.');

    // 1. Delete all blood requests (seeker & hospital requests: pending, approved, fulfilled, cancelled)
    const reqResult = await Request.deleteMany({});
    console.log(`[Cleaned] Removed ${reqResult.deletedCount} blood requests.`);

    // 2. Delete all donation check-in verification QR tokens
    const tokenResult = await DonationToken.deleteMany({});
    console.log(`[Cleaned] Removed ${tokenResult.deletedCount} donation verification tokens.`);

    // 3. Delete all notification logs
    const notifResult = await Notification.deleteMany({});
    console.log(`[Cleaned] Removed ${notifResult.deletedCount} notifications.`);

    // 4. Delete all discrepancy logs
    const discResult = await Discrepancy.deleteMany({});
    console.log(`[Cleaned] Removed ${discResult.deletedCount} discrepancy logs.`);

    // 5. Delete all test blood drives
    const driveResult = await Drive.deleteMany({});
    console.log(`[Cleaned] Removed ${driveResult.deletedCount} blood drives.`);

    // 6. Reset all Donor Profile stats (clear confirmed donations, history, pledge stats) while retaining profiles & accounts
    const donorResult = await DonorProfile.updateMany(
      {},
      {
        $set: {
          confirmedDonations: 0,
          lastDonationDate: null,
          isAvailable: true,
          bio: '',
          cancelledPledges: 0,
          expiredPledges: 0,
          recentPledgeCancelHistory: [],
          pledgeSuspendedUntil: null,
        }
      }
    );
    console.log(`[Reset] Reset stats for ${donorResult.modifiedCount} donor profiles back to fresh 0 status.`);

    // 7. Summary of active accounts preserved
    const usersCount = await User.countDocuments({});
    console.log(`[Preserved] ${usersCount} user accounts (Seekers, Donors, Hospitals, Partners, Admins) remain intact and ready for fresh testing.`);

    console.log('✅ ALL TEST DATA WIPED SUCCESSFULLY! Ready for fresh testing from scratch.');
    process.exit(0);
  } catch (err) {
    console.error('[Error cleaning test data]:', err);
    process.exit(1);
  }
}

clearTestData();
