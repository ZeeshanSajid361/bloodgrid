require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models/User');
const { Organization } = require('./src/models/Organization');
const { DonorProfile } = require('./src/models/DonorProfile');
const { generateApiKey } = require('./src/utils/apiKey');

async function seedPreapprovedAccounts() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('[Error] MONGO_URI missing in environment');
      process.exit(1);
    }
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);

    const defaultPassword = 'password123';
    const adminPassword = 'Password123!';

    const accounts = [
      // 1. Admin Account
      {
        name: 'System Super Admin',
        email: 'admin@bloodgrid.com',
        password: adminPassword,
        role: 'admin',
        phone: '03000000000',
        city: 'Islamabad',
        isEmailVerified: true,
      },
      // 2. Hospital Account 1 (Web UI Hospital)
      {
        name: 'Main City Hospital Admin',
        email: 'hospital.web@bloodgrid.com',
        password: defaultPassword,
        role: 'hospital',
        phone: '03001234567',
        city: 'Islamabad',
        isEmailVerified: true,
        orgName: 'Emergency Hospital PIMS',
        orgType: 'web_hospital',
      },
      // 3. Hospital Account 2 (API Integrated Hospital - EMN Sync)
      {
        name: 'FAST Medical Center Admin',
        email: 'hospital.api@bloodgrid.com',
        password: defaultPassword,
        role: 'hospital',
        phone: '03007654321',
        city: 'Islamabad',
        isEmailVerified: true,
        orgName: 'University Medical Center (EMN API)',
        orgType: 'api_hospital',
      },
      // 4. Hospital Account 3 (Regional Hospital & Clinic)
      {
        name: 'Regional Clinic Admin',
        email: 'hospital.clinic@bloodgrid.com',
        password: defaultPassword,
        role: 'hospital',
        phone: '03009998877',
        city: 'Rawalpindi',
        isEmailVerified: true,
        orgName: 'Regional Blood Bank & Clinic',
        orgType: 'hospital',
      },
      // 5. Seeker Accounts (seeker1@bloodgrid.com to seeker5@bloodgrid.com)
      { name: 'Seeker One', email: 'seeker1@bloodgrid.com', password: defaultPassword, role: 'seeker', phone: '03001110001', city: 'Islamabad', isEmailVerified: true },
      { name: 'Seeker Two', email: 'seeker2@bloodgrid.com', password: defaultPassword, role: 'seeker', phone: '03001110002', city: 'Rawalpindi', isEmailVerified: true },
      { name: 'Seeker Three', email: 'seeker3@bloodgrid.com', password: defaultPassword, role: 'seeker', phone: '03001110003', city: 'Lahore', isEmailVerified: true },
      { name: 'Seeker Four', email: 'seeker4@bloodgrid.com', password: defaultPassword, role: 'seeker', phone: '03001110004', city: 'Karachi', isEmailVerified: true },
      { name: 'Seeker Five', email: 'seeker5@bloodgrid.com', password: defaultPassword, role: 'seeker', phone: '03001110005', city: 'Peshawar', isEmailVerified: true },

      // 6. Voluntary Donor Accounts (donor1@bloodgrid.com to donor5@bloodgrid.com)
      //     gender/age are required by the DonorProfile schema and drive the WHO
      //     cooldown engine (90d male / 120d female) + badge levels on the dashboard.
      { name: 'Donor One (A+)', email: 'donor1@bloodgrid.com', password: defaultPassword, role: 'donor', phone: '03004440001', city: 'Islamabad', bloodGroup: 'A+', gender: 'male', age: 28, isEmailVerified: true },
      { name: 'Donor Two (O+)', email: 'donor2@bloodgrid.com', password: defaultPassword, role: 'donor', phone: '03004440002', city: 'Rawalpindi', bloodGroup: 'O+', gender: 'female', age: 32, isEmailVerified: true },
      { name: 'Donor Three (B+)', email: 'donor3@bloodgrid.com', password: defaultPassword, role: 'donor', phone: '03004440003', city: 'Lahore', bloodGroup: 'B+', gender: 'male', age: 24, isEmailVerified: true },
      { name: 'Donor Four (AB+)', email: 'donor4@bloodgrid.com', password: defaultPassword, role: 'donor', phone: '03004440004', city: 'Karachi', bloodGroup: 'AB+', gender: 'female', age: 29, isEmailVerified: true },
      { name: 'Donor Five (O- Universal)', email: 'donor5@bloodgrid.com', password: defaultPassword, role: 'donor', phone: '03004440005', city: 'Islamabad', bloodGroup: 'O-', gender: 'male', age: 35, isEmailVerified: true },

      // 7. Community Partner Account (Pre-approved NGO/Drive Organizer)
      {
        name: 'Red Cross Partner Admin',
        email: 'partner@bloodgrid.com',
        password: defaultPassword,
        role: 'hospital',
        phone: '03007778899',
        city: 'Islamabad',
        isEmailVerified: true,
        orgName: 'Red Cross Blood Foundation',
        orgType: 'partner',
      },
    ];

    console.log('\n[Seed] Seeding & pre-approving all dummy accounts...\n');

    for (const acc of accounts) {
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        user = new User({
          name: acc.name,
          email: acc.email,
          password: acc.password,
          role: acc.role,
          phone: acc.phone,
          city: acc.city,
          isEmailVerified: true,
        });
        await user.save();
        console.log(`  ✅ Created pre-approved user: ${acc.email} (${acc.role})`);
      } else {
        user.password = acc.password;
        user.role = acc.role;
        user.isEmailVerified = true;
        await user.save();
        console.log(`  ✓ Updated & pre-verified user: ${acc.email} (${acc.role})`);
      }

      // Donors also need a DonorProfile — without it /api/donors/me 404s and the
      // donor dashboard (eligibility engine, badges, live matching) breaks.
      if (acc.role === 'donor') {
        const existingProfile = await DonorProfile.findOne({ user: user._id });
        const profileData = {
          user: user._id,
          age: acc.age || 28,
          gender: acc.gender || 'male',
          bloodGroup: acc.bloodGroup || 'A+',
          lastDonationDate: null,   // immediately eligible per WHO cooldown engine
          isAvailable: true,
        };
        if (!existingProfile) {
          await DonorProfile.create(profileData);
          console.log(`     -> Created donor profile: ${acc.bloodGroup} (${acc.gender}, ${acc.age})`);
        } else {
          await DonorProfile.updateOne({ _id: existingProfile._id }, { $set: profileData });
        }
      }

      // If account is hospital or partner, ensure linked Organization is approved
      if (acc.role === 'hospital' || acc.role === 'partner') {
        let org = await Organization.findOne({ owner: user._id });
        if (!org) {
          const { rawKey, hash, lookup } = await generateApiKey();
          org = await Organization.create({
            owner: user._id,
            name: acc.orgName || `${acc.name} Org`,
            type: acc.orgType || 'hospital',
            address: { city: acc.city, street: 'Main Boulevard', province: 'Capital Territory' },
            phone: acc.phone,
            email: acc.email,
            status: 'approved',
            verificationDocumentUrls: ['https://res.cloudinary.com/demo/image/upload/sample.png'],
            apiKeyHash: hash,
            apiKeyPrefix: `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`,
            apiKeyLookup: lookup,
          });
          console.log(`     -> Created pre-approved org: "${org.name}" (Status: APPROVED)`);
        } else {
          org.status = 'approved';
          // Backfill the O(1) lookup prefix for orgs seeded before it existed.
          if (!org.apiKeyLookup && org.apiKeyHash) {
            // Hashed keys can't be reversed — issue a fresh key instead.
            const { rawKey, hash, lookup } = await generateApiKey();
            org.apiKeyHash = hash;
            org.apiKeyPrefix = `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
            org.apiKeyLookup = lookup;
          }
          await org.save();
          console.log(`     -> Pre-approved org: "${org.name}" (Status: APPROVED)`);
        }
      }
    }

    console.log('\n🎉 ALL DUMMY ACCOUNTS PRE-APPROVED AND READY FOR LOG IN!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
    process.exit(1);
  }
}

seedPreapprovedAccounts();
