import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const COUNTRIES = [
  { iso: 'PK', code: '+92',  name: 'Pakistan' },
  { iso: 'US', code: '+1',   name: 'United States' },
  { iso: 'GB', code: '+44',  name: 'United Kingdom' },
  { iso: 'CA', code: '+1',   name: 'Canada' },
  { iso: 'AE', code: '+971', name: 'UAE' },
  { iso: 'SA', code: '+966', name: 'Saudi Arabia' },
  { iso: 'QA', code: '+974', name: 'Qatar' },
  { iso: 'OM', code: '+968', name: 'Oman' },
  { iso: 'KW', code: '+965', name: 'Kuwait' },
  { iso: 'BH', code: '+973', name: 'Bahrain' },
  { iso: 'IN', code: '+91',  name: 'India' },
  { iso: 'BD', code: '+880', name: 'Bangladesh' },
  { iso: 'LK', code: '+94',  name: 'Sri Lanka' },
  { iso: 'NP', code: '+977', name: 'Nepal' },
  { iso: 'MV', code: '+960', name: 'Maldives' },
  { iso: 'AF', code: '+93',  name: 'Afghanistan' },
  { iso: 'TR', code: '+90',  name: 'Turkey' },
  { iso: 'MY', code: '+60',  name: 'Malaysia' },
  { iso: 'SG', code: '+65',  name: 'Singapore' },
  { iso: 'ID', code: '+62',  name: 'Indonesia' },
  { iso: 'TH', code: '+66',  name: 'Thailand' },
  { iso: 'PH', code: '+63',  name: 'Philippines' },
  { iso: 'VN', code: '+84',  name: 'Vietnam' },
  { iso: 'JP', code: '+81',  name: 'Japan' },
  { iso: 'KR', code: '+82',  name: 'South Korea' },
  { iso: 'CN', code: '+86',  name: 'China' },
  { iso: 'HK', code: '+852', name: 'Hong Kong' },
  { iso: 'TW', code: '+886', name: 'Taiwan' },
  { iso: 'AU', code: '+61',  name: 'Australia' },
  { iso: 'NZ', code: '+64',  name: 'New Zealand' },
  { iso: 'DE', code: '+49',  name: 'Germany' },
  { iso: 'FR', code: '+33',  name: 'France' },
  { iso: 'IT', code: '+39',  name: 'Italy' },
  { iso: 'ES', code: '+34',  name: 'Spain' },
  { iso: 'NL', code: '+31',  name: 'Netherlands' },
  { iso: 'CH', code: '+41',  name: 'Switzerland' },
  { iso: 'SE', code: '+46',  name: 'Sweden' },
  { iso: 'NO', code: '+47',  name: 'Norway' },
  { iso: 'DK', code: '+45',  name: 'Denmark' },
  { iso: 'FI', code: '+358', name: 'Finland' },
  { iso: 'IE', code: '+353', name: 'Ireland' },
  { iso: 'BE', code: '+32',  name: 'Belgium' },
  { iso: 'AT', code: '+43',  name: 'Austria' },
  { iso: 'PT', code: '+351', name: 'Portugal' },
  { iso: 'GR', code: '+30',  name: 'Greece' },
  { iso: 'PL', code: '+48',  name: 'Poland' },
  { iso: 'RO', code: '+40',  name: 'Romania' },
  { iso: 'CZ', code: '+420', name: 'Czechia' },
  { iso: 'HU', code: '+36',  name: 'Hungary' },
  { iso: 'ZA', code: '+27',  name: 'South Africa' },
  { iso: 'EG', code: '+20',  name: 'Egypt' },
  { iso: 'NG', code: '+234', name: 'Nigeria' },
  { iso: 'KE', code: '+254', name: 'Kenya' },
  { iso: 'MA', code: '+212', name: 'Morocco' },
  { iso: 'DZ', code: '+213', name: 'Algeria' },
  { iso: 'TN', code: '+216', name: 'Tunisia' },
  { iso: 'GH', code: '+233', name: 'Ghana' },
  { iso: 'ET', code: '+251', name: 'Ethiopia' },
  { iso: 'BR', code: '+55',  name: 'Brazil' },
  { iso: 'MX', code: '+52',  name: 'Mexico' },
  { iso: 'AR', code: '+54',  name: 'Argentina' },
  { iso: 'CL', code: '+56',  name: 'Chile' },
  { iso: 'CO', code: '+57',  name: 'Colombia' },
  { iso: 'PE', code: '+51',  name: 'Peru' },
  { iso: 'VE', code: '+58',  name: 'Venezuela' },
  { iso: 'RU', code: '+7',   name: 'Russia' },
  { iso: 'UA', code: '+380', name: 'Ukraine' },
  { iso: 'IR', code: '+98',  name: 'Iran' },
  { iso: 'IQ', code: '+964', name: 'Iraq' },
  { iso: 'JO', code: '+962', name: 'Jordan' },
  { iso: 'LB', code: '+961', name: 'Lebanon' },
  { iso: 'SY', code: '+963', name: 'Syria' },
  { iso: 'PS', code: '+970', name: 'Palestine' },
  { iso: 'YE', code: '+967', name: 'Yemen' },
];

const SORTED_CODES = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

export default function PhoneInput({ value = '', onChange, name = 'phone', placeholder = '300 0000000' }) {
  const [country, setCountry] = useState('+92');
  const [localNumber, setLocalNumber] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!value) {
      setLocalNumber('');
      return;
    }
    const found = SORTED_CODES.find(c => value.startsWith(c.code));
    if (found) {
      setCountry(found.code);
      const remainder = value.slice(found.code.length).trim();
      setLocalNumber(formatLocal(remainder));
    } else {
      setLocalNumber(formatLocal(value));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function formatLocal(text) {
    const raw = text.replace(/\D/g, '');
    if (!raw) return '';
    if (raw.startsWith('0')) {
      const prefix = raw.slice(0, 4);
      const suffix = raw.slice(4, 11);
      return suffix ? `${prefix}-${suffix}` : prefix;
    } else {
      const prefix = raw.slice(0, 3);
      const suffix = raw.slice(3, 10);
      return suffix ? `${prefix}-${suffix}` : prefix;
    }
  }

  function handleNumberChange(e) {
    const formatted = formatLocal(e.target.value);
    setLocalNumber(formatted);
    const fullNumber = formatted ? `${country} ${formatted}` : '';
    if (onChange) onChange({ target: { name, value: fullNumber } });
  }

  function handleSelectCountry(code) {
    setCountry(code);
    setIsOpen(false);
    setSearch('');
    const fullNumber = localNumber ? `${code} ${localNumber}` : '';
    if (onChange) onChange({ target: { name, value: fullNumber } });
  }

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search) ||
    c.iso.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', gap: '8px', width: '100%' }}>
      {/* Trigger Button */}
      <button
        type="button"
        className="input"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '90px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          fontWeight: 700,
          fontSize: '0.84rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span>{country}</span>
        <ChevronDown size={14} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '270px',
            maxHeight: '260px',
            background: 'var(--surface-color, #131926)',
            border: '1px solid var(--border-color, #273142)',
            borderRadius: '10px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Search Box */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color, #273142)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} style={{ opacity: 0.5, flexShrink: 0, marginLeft: '4px' }} />
            <input
              type="text"
              placeholder="Search country or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.8rem',
              }}
            />
          </div>

          {/* Country Options List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {filteredCountries.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.78rem', opacity: 0.6, textAlign: 'center' }}>No countries found</div>
            ) : (
              filteredCountries.map(c => {
                const isSelected = c.code === country;
                return (
                  <button
                    key={`${c.iso}-${c.code}`}
                    type="button"
                    onClick={() => handleSelectCountry(c.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 12px',
                      background: isSelected ? 'rgba(255, 77, 77, 0.15)' : 'transparent',
                      border: 'none',
                      color: isSelected ? '#ff4d4d' : '#e2e8f0',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{c.name}</span>
                    <span style={{ fontSize: '0.78rem', opacity: 0.75, fontFamily: 'monospace' }}>{c.code}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Local Number Field */}
      <input
        type="tel"
        className="input"
        placeholder={placeholder}
        value={localNumber}
        onChange={handleNumberChange}
        style={{ flex: 1, minWidth: 0, fontSize: '0.84rem', paddingLeft: '10px', paddingRight: '10px' }}
      />
    </div>
  );
}
