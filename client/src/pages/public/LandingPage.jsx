import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, Search, Shield, Zap, Award, UserPlus, 
  MapPin, CheckCircle, ArrowRight, Activity, Users, PhoneCall, Menu, X, AlertTriangle 
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

const MOCK_PUBLIC_DONORS = [
  { id: 'd1', name: 'Zeeshan S.', bloodGroup: 'O-', city: 'Islamabad', area: 'F-8 / G-9', isAvailable: true, level: 'Spark Donor' },
  { id: 'd2', name: 'Ali Raza', bloodGroup: 'O-', city: 'Islamabad', area: 'Blue Area', isAvailable: true, level: 'Pulse Donor' },
  { id: 'd3', name: 'Hamza Tariq', bloodGroup: 'A+', city: 'Rawalpindi', area: 'Saddar', isAvailable: true, level: 'Life Saver' },
  { id: 'd4', name: 'Usman Malik', bloodGroup: 'B+', city: 'Lahore', area: 'Gulberg', isAvailable: true, level: 'Guardian' },
  { id: 'd5', name: 'Bilal Ahmed', bloodGroup: 'AB-', city: 'Karachi', area: 'Clifton', isAvailable: true, level: 'Anchor' },
  { id: 'd6', name: 'Sara Khan', bloodGroup: 'O+', city: 'Islamabad', area: 'E-11', isAvailable: true, level: 'Spark Donor' },
];

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [connectDonorModal, setConnectDonorModal] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const compatibleDonors = COMPATIBILITY_MAP[selectedGroup] || [selectedGroup];

  function handleSearch(e) {
    e.preventDefault();
    setHasSearched(true);

    const filtered = MOCK_PUBLIC_DONORS.filter((d) => {
      const isCompatGroup = compatibleDonors.includes(d.bloodGroup);
      const isCityMatch = selectedCity
        ? d.city.toLowerCase().includes(selectedCity.trim().toLowerCase())
        : true;
      return isCompatGroup && isCityMatch;
    });

    setSearchResults(filtered);
  }

  return (
    <div className="landing-page">
      {/* ── Public Navbar ── */}
      <header className="landing-nav">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-icon">🩸</div>
          <span className="landing-logo-text">Blood<span>Link</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="landing-nav-links">
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#checker">Donor Checker</a></li>
          <li><a href="#emergencies">Live Requests</a></li>
          <li><a href="#tiers">Recognition</a></li>
        </ul>

        {/* Desktop Action Buttons */}
        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-ghost btn-sm">
            Sign In
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            Register
          </Link>
        </div>

        {/* Mobile Hamburger Toggle (≡ 3 parallel lines button) */}
        <button 
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>

        {/* Mobile Dropdown Slide Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>📍 How It Works</a>
            <a href="#checker" onClick={() => setMobileMenuOpen(false)}>🩸 Donor Compatibility Checker</a>
            <a href="#emergencies" onClick={() => setMobileMenuOpen(false)}>⚡ Live Emergency Board</a>
            <a href="#tiers" onClick={() => setMobileMenuOpen(false)}>🏆 Donor Recognition Tiers</a>
            <a href="#emergency-contact" onClick={() => { setMobileMenuOpen(false); setShowEmergencyModal(true); }}>
              🚑 24/7 Emergency Helpline
            </a>

            <div className="landing-mobile-actions">
              <Link to="/login" className="btn btn-ghost btn-full" onClick={() => setMobileMenuOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-full" onClick={() => setMobileMenuOpen(false)}>
                Register
              </Link>
            </div>
          </div>
        )}
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

      {/* ── Instant Donor Compatibility Checker Section ── */}
      <section id="checker" className="section-wrapper">
        <div className="section-title-wrap">
          <div className="section-tag">Smart Matching</div>
          <h2 className="section-main-title">Instant Donor Compatibility</h2>
          <p className="section-desc">Select a patient's blood group to see which donor blood types can safely donate to them.</p>
        </div>

        <div className="search-widget-card">
          <form className="widget-grid" onSubmit={handleSearch}>
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

            <button type="submit" className="btn btn-primary">
              <Search size={18} /> Search Active Donors
            </button>
          </form>

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

          {/* Real Live Search Results Rendered directly on Landing Page */}
          {hasSearched && (
            <div className="public-search-results">
              <div className="results-header">
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Available Compatible Donors</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Found {searchResults.length} verified donor(s) compatible with {selectedGroup}
                  </p>
                </div>
                <span className="badge badge-green">REAL-TIME</span>
              </div>

              {searchResults.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No exact match found in this city right now. Try expanding your search or registering a request.
                </div>
              ) : (
                <div className="results-grid">
                  {searchResults.map((d) => (
                    <div key={d.id} className="donor-public-card">
                      <div className="donor-public-top">
                        <div className="donor-public-avatar">{d.name[0]}</div>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{d.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.level}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Group:</span>
                        <span className="blood-group-badge" style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}>{d.bloodGroup}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                        <span style={{ fontWeight: 600 }}>{d.city} ({d.area})</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                        <span className="badge badge-green">✓ Active Now</span>
                      </div>

                      <button 
                        className="btn btn-ghost btn-sm btn-full"
                        style={{ marginTop: 'var(--space-2)' }}
                        onClick={() => setConnectDonorModal(d)}
                      >
                        Request / Contact Donor <ArrowRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>🌱</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Spark</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>1 Confirmed Donation</p>
          </div>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>⚡</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Pulse</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>3 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>❤️</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Life Saver</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>5 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Guardian</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>10 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
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
            <h4>Emergency Help</h4>
            <ul>
              <li style={{ color: 'var(--red-300)', fontWeight: 700 }}>24/7 Helpline: 1122</li>
              <li>Support: help@bloodlink.org</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} BloodLink 2.0. All rights reserved.</p>
          <p>Built with ❤️ to save lives.</p>
        </div>
      </footer>

      {/* ── Floating 24/7 Emergency Help Button ── */}
      <button 
        className="emergency-float-btn"
        onClick={() => setShowEmergencyModal(true)}
      >
        <PhoneCall size={18} /> 24/7 Emergency Helpline
      </button>

      {/* ── Contact / Connect Donor Modal ── */}
      {connectDonorModal && (
        <div className="profile-modal-overlay" onClick={() => setConnectDonorModal(null)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <button className="profile-modal-close" onClick={() => setConnectDonorModal(null)}>
                <X size={18} />
              </button>
              <div className="profile-avatar-large">{connectDonorModal.name[0]}</div>
              <div className="profile-modal-name">{connectDonorModal.name}</div>
              <div className="profile-modal-role">Available Donor ({connectDonorModal.bloodGroup})</div>
            </div>

            <div className="profile-modal-body">
              <div className="profile-info-row">
                <span className="profile-info-label">City / Region</span>
                <span className="profile-info-val">{connectDonorModal.city} ({connectDonorModal.area})</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Donor Tier</span>
                <span className="badge badge-blue">{connectDonorModal.level}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textCenter: 'center', marginTop: 'var(--space-2)' }}>
                To contact this voluntary donor or submit an official emergency request, please sign in to your seeker account.
              </p>
            </div>

            <div className="profile-modal-actions">
              <Link to="/login" className="btn btn-primary btn-full">
                Sign In as Seeker to Connect
              </Link>
              <Link to="/register" className="btn btn-ghost btn-full">
                Create Free Seeker Account
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Emergency Help Modal ── */}
      {showEmergencyModal && (
        <div className="profile-modal-overlay" onClick={() => setShowEmergencyModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ background: 'linear-gradient(135deg, rgba(192,57,43,0.3), rgba(15,21,32,0.95))' }}>
              <button className="profile-modal-close" onClick={() => setShowEmergencyModal(false)}>
                <X size={18} />
              </button>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🚑</div>
              <div className="profile-modal-name">24/7 Emergency Blood Helpline</div>
              <div className="profile-modal-role">Immediate Assistance</div>
            </div>

            <div className="profile-modal-body">
              <div className="profile-info-row" style={{ background: 'rgba(192, 57, 43, 0.1)', borderColor: 'rgba(192,57,43,0.3)' }}>
                <span className="profile-info-label" style={{ color: 'var(--red-300)', fontWeight: 700 }}>National Emergency</span>
                <a href="tel:1122" style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', textDecoration: 'none' }}>📞 1122</a>
              </div>

              <div className="profile-info-row">
                <span className="profile-info-label">BloodLink Rescue Line</span>
                <a href="tel:+925111125663" style={{ color: 'var(--text-primary)', fontWeight: 700, textDecoration: 'none' }}>+92 51 111 25663</a>
              </div>

              <div className="profile-info-row">
                <span className="profile-info-label">Official Support Email</span>
                <span className="profile-info-val">help@bloodlink.org</span>
              </div>
            </div>

            <div className="profile-modal-actions">
              <Link to="/login" className="btn btn-primary btn-full" onClick={() => setShowEmergencyModal(false)}>
                Post Urgent Emergency Request
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
