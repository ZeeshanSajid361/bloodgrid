import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, Search, Shield, Zap, Award, UserPlus, 
  MapPin, CheckCircle, ArrowRight, Activity, Users, PhoneCall 
} from 'lucide-react';
import './LandingPage.css';

const COMPATIBILITY_MAP = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

// Realistic dummy emergency requests for public landing board
const DEMO_EMERGENCIES = [
  {
    id: 'req-1',
    patientName: 'Ayesha Khan',
    bloodGroup: 'O-',
    units: 2,
    hospital: 'Shifa International Hospital',
    city: 'Islamabad',
    urgency: 'Critical',
    timeAgo: '15 mins ago',
  },
  {
    id: 'req-2',
    patientName: 'Muhammad Usman',
    bloodGroup: 'AB-',
    units: 3,
    hospital: 'PIMS Hospital',
    city: 'Islamabad',
    urgency: 'Urgent',
    timeAgo: '42 mins ago',
  },
  {
    id: 'req-3',
    patientName: 'Zainab Ahmed',
    bloodGroup: 'B+',
    units: 1,
    hospital: 'Combined Military Hospital (CMH)',
    city: 'Rawalpindi',
    urgency: 'Standard',
    timeAgo: '2 hours ago',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState('O-');
  const [selectedCity, setSelectedCity]   = useState('');

  const compatibleDonors = COMPATIBILITY_MAP[selectedGroup] || [selectedGroup];

  return (
    <div className="landing-page">
      {/* ── Public Navbar ── */}
      <header className="landing-nav">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-icon">🩸</div>
          <span className="landing-logo-text">Blood<span>Link</span></span>
        </Link>

        <ul className="landing-nav-links">
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#checker">Donor Checker</a></li>
          <li><a href="#emergencies">Live Requests</a></li>
          <li><a href="#tiers">Recognition</a></li>
        </ul>

        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-ghost btn-sm">
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            Register
          </Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-pill">
            <Activity size={15} /> Real-Time Blood Matching Network
          </div>
          <h1 className="hero-title">
            Every Drop Counts. <span>Save Lives</span> in Real-Time.
          </h1>
          <p className="hero-subtitle">
            BloodLink connects voluntary blood donors directly with critical patients and emergency hospital wards across your city within minutes.
          </p>

          <div className="hero-ctas">
            <Link to="/register" className="btn btn-primary btn-lg">
              <UserPlus size={20} /> Create an Account
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              <Search size={20} /> Request Blood / Find Donors
            </Link>
          </div>
        </div>

        {/* Hero Visual Card / Live Stats */}
        <div className="hero-visual">
          <div className="hero-card-glass">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>BloodLink Impact</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Verified real-time network activity</p>
              </div>
              <span className="badge badge-green">LIVE SYSTEM</span>
            </div>

            <div className="hero-stats-grid">
              <div className="hero-stat-item">
                <span className="hero-stat-num red">1,420+</span>
                <span className="hero-stat-label">Active Donors</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-num green">980+</span>
                <span className="hero-stat-label">Lives Saved</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-num blue">45+</span>
                <span className="hero-stat-label">Hospitals</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-num">&lt; 15m</span>
                <span className="hero-stat-label">Avg Response</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Instant Donor Compatibility Checker ── */}
      <section id="checker" className="section-wrapper">
        <div className="section-title-wrap">
          <div className="section-tag">Smart Matching</div>
          <h2 className="section-main-title">Instant Donor Compatibility</h2>
          <p className="section-desc">Select a patient's blood group to see which donor blood types can safely donate to them.</p>
        </div>

        <div className="search-widget-card">
          <div className="widget-grid">
            <div className="input-group">
              <label className="input-label">Patient Blood Group</label>
              <select 
                className="input" 
                value={selectedGroup} 
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">City / Region (Optional)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Islamabad, Lahore, Karachi" 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)} 
              />
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => navigate(`/login`)}
            >
              <Search size={18} /> Search Active Donors
            </button>
          </div>

          <div className="compatibility-matrix">
            <div className="compat-card">
              <div className="compat-group-title">
                <span>Patient Needs: {selectedGroup}</span>
                <span className="badge badge-red">Compatible</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                This patient can safely receive blood donations from:
              </p>
              <div className="compat-list">
                {compatibleDonors.map((type) => (
                  <span key={type} className="badge badge-blue" style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Emergency Board ── */}
      <section id="emergencies" className="section-wrapper" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-2xl)' }}>
        <div className="section-title-wrap">
          <div className="section-tag">Urgent Need</div>
          <h2 className="section-main-title">Live Emergency Requests</h2>
          <p className="section-desc">Critical blood requests posted by verified seekers and emergency units.</p>
        </div>

        <div className="emergency-grid">
          {DEMO_EMERGENCIES.map((req) => (
            <div key={req.id} className="emergency-card">
              <div className="emergency-card-header">
                <span className={`badge ${req.urgency === 'Critical' ? 'badge-red' : 'badge-amber'}`}>
                  {req.urgency}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.timeAgo}</span>
              </div>

              <div>
                <h4 className="emergency-hospital">{req.hospital}</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />{req.city}</p>
              </div>

              <div className="emergency-details">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Required Type:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--red-400)' }}>{req.bloodGroup}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Units Needed:</span>
                  <span style={{ fontWeight: 700 }}>{req.units} unit(s)</span>
                </div>
              </div>

              <Link to="/login" className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 'var(--space-2)' }}>
                Respond / Login to Donate <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="section-wrapper">
        <div className="section-title-wrap">
          <div className="section-tag">Simple & Fast</div>
          <h2 className="section-main-title">How BloodLink Works</h2>
          <p className="section-desc">Connecting life-savers with patients in 3 streamlined steps.</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <h3 className="step-title">Register & Set Availability</h3>
            <p className="step-desc">
              Donors sign up, set their blood group and location, and toggle their availability status whenever they are cleared to donate.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">2</div>
            <h3 className="step-title">Instant Request & Match</h3>
            <p className="step-desc">
              Seekers or hospitals post urgent blood requirements. Our smart matching algorithm notifies eligible donors nearby instantly.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">3</div>
            <h3 className="step-title">Verify & Earn Recognition</h3>
            <p className="step-desc">
              Donations are verified seamlessly using digital QR check-in, unlocking recognition badges and gamified donor levels.
            </p>
          </div>
        </div>
      </section>

      {/* ── Recognition Tiers ── */}
      <section id="tiers" className="section-wrapper" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-2xl)', marginTop: 'var(--space-8)' }}>
        <div className="section-title-wrap">
          <div className="section-tag">Gamified Impact</div>
          <h2 className="section-main-title">Donor Recognition Tiers</h2>
          <p className="section-desc">Earn badges and level up as you complete verified blood donations.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="compat-card" style={{ textCenter: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>🌱</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Spark</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>1 Confirmed Donation</p>
          </div>
          <div className="compat-card" style={{ textCenter: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>⚡</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Pulse</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>3 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textCenter: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>❤️</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Life Saver</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>5 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textCenter: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Guardian</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>10 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textCenter: 'center', textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>⚓</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Anchor</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>25+ Confirmed Donations</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link to="/" className="landing-logo">
              <div className="landing-logo-icon">🩸</div>
              <span className="landing-logo-text">Blood<span>Link</span></span>
            </Link>
            <p>
              A modern, community-driven emergency blood donor connection platform committed to saving lives.
            </p>
          </div>

          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><Link to="/login">Donor Portal</Link></li>
              <li><Link to="/login">Seeker Portal</Link></li>
              <li><Link to="/login">Hospital Portal</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#checker">Donor Checker</a></li>
              <li><a href="#emergencies">Live Requests</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Emergency</h4>
            <ul>
              <li style={{ color: 'var(--red-300)', fontWeight: 700 }}>Helpline: 1122</li>
              <li>Support: help@bloodlink.org</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} BloodLink 2.0. All rights reserved.</p>
          <p>Built with ❤️ to save lives.</p>
        </div>
      </footer>
    </div>
  );
}
