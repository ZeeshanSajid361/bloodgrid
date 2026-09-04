/**
 * Drive schema — Blood Donation Camps / Drives organized by Partner Organisations.
 */

'use strict';

const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Camp title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Camp date is required'],
    },
    startTime: {
      type: String,
      default: '09:00 AM',
    },
    endTime: {
      type: String,
      default: '05:00 PM',
    },
    location: {
      address: String,
      city: { type: String, required: true },
      mapsUrl: String,
      latitude: Number,
      longitude: Number,
    },
    targetBloodGroups: [{
      type: String,
    }],
    expectedTurnout: {
      type: Number,
      default: 50,
    },
    rsvps: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      userPhone: String,
      bloodGroup: String,
      createdAt: { type: Date, default: Date.now }
    }],
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Partner dashboard lists its own camps sorted by date; status filters (upcoming/
// ongoing) plus city browse are the other two read patterns. Previously the
// Drive collection had zero indexes — every list query was a full collection scan.
driveSchema.index({ organizationId: 1, date: 1 });
driveSchema.index({ status: 1, date: 1 });
driveSchema.index({ 'location.city': 1, date: -1 });

const Drive = mongoose.model('Drive', driveSchema);

module.exports = { Drive };
