import { useState, useEffect } from 'react';

const COUNTRY_CODES = [
  { iso: 'PK', code: '+92',  flag: '🇵🇰', label: 'Pakistan' },
  { iso: 'US', code: '+1',   flag: '🇺🇸', label: 'United States' },
  { iso: 'GB', code: '+44',  flag: '🇬🇧', label: 'United Kingdom' },
  { iso: 'CA', code: '+1',   flag: '🇨🇦', label: 'Canada' },
  { iso: 'AE', code: '+971', flag: '🇦🇪', label: 'UAE' },
  { iso: 'SA', code: '+966', flag: '🇸🇦', label: 'Saudi Arabia' },
  { iso: 'QA', code: '+974', flag: '🇶🇦', label: 'Qatar' },
  { iso: 'OM', code: '+968', flag: '🇴🇲', label: 'Oman' },
  { iso: 'KW', code: '+965', flag: '🇰🇼', label: 'Kuwait' },
  { iso: 'BH', code: '+973', flag: '🇧🇭', label: 'Bahrain' },
  { iso: 'IN', code: '+91',  flag: '🇮🇳', label: 'India' },
  { iso: 'BD', code: '+880', flag: '🇧🇩', label: 'Bangladesh' },
  { iso: 'LK', code: '+94',  flag: '🇱🇰', label: 'Sri Lanka' },
  { iso: 'NP', code: '+977', flag: '🇳🇵', label: 'Nepal' },
  { iso: 'MV', code: '+960', flag: '🇲🇻', label: 'Maldives' },
  { iso: 'AF', code: '+93',  flag: '🇦🇫', label: 'Afghanistan' },
  { iso: 'TR', code: '+90',  flag: '🇹🇷', label: 'Turkey' },
  { iso: 'MY', code: '+60',  flag: '🇲🇾', label: 'Malaysia' },
  { iso: 'SG', code: '+65',  flag: '🇸🇬', label: 'Singapore' },
  { iso: 'ID', code: '+62',  flag: '🇮🇩', label: 'Indonesia' },
  { iso: 'TH', code: '+66',  flag: '🇹🇭', label: 'Thailand' },
  { iso: 'PH', code: '+63',  flag: '🇵🇭', label: 'Philippines' },
  { iso: 'VN', code: '+84',  flag: '🇻🇳', label: 'Vietnam' },
  { iso: 'JP', code: '+81',  flag: '🇯🇵', label: 'Japan' },
  { iso: 'KR', code: '+82',  flag: '🇰🇷', label: 'South Korea' },
  { iso: 'CN', code: '+86',  flag: '🇨🇳', label: 'China' },
  { iso: 'HK', code: '+852', flag: '🇭🇰', label: 'Hong Kong' },
  { iso: 'TW', code: '+886', flag: '🇹🇼', label: 'Taiwan' },
  { iso: 'AU', code: '+61',  flag: '🇦🇺', label: 'Australia' },
  { iso: 'NZ', code: '+64',  flag: '🇳🇿', label: 'New Zealand' },
  { iso: 'DE', code: '+49',  flag: '🇩🇪', label: 'Germany' },
  { iso: 'FR', code: '+33',  flag: '🇫🇷', label: 'France' },
  { iso: 'IT', code: '+39',  flag: '🇮🇹', label: 'Italy' },
  { iso: 'ES', code: '+34',  flag: '🇪🇸', label: 'Spain' },
  { iso: 'NL', code: '+31',  flag: '🇳🇱', label: 'Netherlands' },
  { iso: 'CH', code: '+41',  flag: '🇨🇭', label: 'Switzerland' },
  { iso: 'SE', code: '+46',  flag: '🇸🇪', label: 'Sweden' },
  { iso: 'NO', code: '+47',  flag: '🇳🇴', label: 'Norway' },
  { iso: 'DK', code: '+45',  flag: '🇩🇰', label: 'Denmark' },
  { iso: 'FI', code: '+358', flag: '🇫🇮', label: 'Finland' },
  { iso: 'IE', code: '+353', flag: '🇮🇪', label: 'Ireland' },
  { iso: 'BE', code: '+32',  flag: '🇧🇪', label: 'Belgium' },
  { iso: 'AT', code: '+43',  flag: '🇦🇹', label: 'Austria' },
  { iso: 'PT', code: '+351', flag: '🇵🇹', label: 'Portugal' },
  { iso: 'GR', code: '+30',  flag: '🇬🇷', label: 'Greece' },
  { iso: 'PL', code: '+48',  flag: '🇵🇱', label: 'Poland' },
  { iso: 'RO', code: '+40',  flag: '🇷🇴', label: 'Romania' },
  { iso: 'CZ', code: '+420', flag: '🇨🇿', label: 'Czechia' },
  { iso: 'HU', code: '+36',  flag: '🇭🇺', label: 'Hungary' },
  { iso: 'ZA', code: '+27',  flag: '🇿🇦', label: 'South Africa' },
  { iso: 'EG', code: '+20',  flag: '🇪🇬', label: 'Egypt' },
  { iso: 'NG', code: '+234', flag: '🇳🇬', label: 'Nigeria' },
  { iso: 'KE', code: '+254', flag: '🇰🇪', label: 'Kenya' },
  { iso: 'MA', code: '+212', flag: '🇲🇦', label: 'Morocco' },
  { iso: 'DZ', code: '+213', flag: '🇩🇿', label: 'Algeria' },
  { iso: 'TN', code: '+216', flag: '🇹🇳', label: 'Tunisia' },
  { iso: 'GH', code: '+233', flag: '🇬🇭', label: 'Ghana' },
  { iso: 'ET', code: '+251', flag: '🇪🇹', label: 'Ethiopia' },
  { iso: 'BR', code: '+55',  flag: '🇧🇷', label: 'Brazil' },
  { iso: 'MX', code: '+52',  flag: '🇲🇽', label: 'Mexico' },
  { iso: 'AR', code: '+54',  flag: '🇦🇷', label: 'Argentina' },
  { iso: 'CL', code: '+56',  flag: '🇨🇱', label: 'Chile' },
  { iso: 'CO', code: '+57',  flag: '🇨🇴', label: 'Colombia' },
  { iso: 'PE', code: '+51',  flag: '🇵🇪', label: 'Peru' },
  { iso: 'VE', code: '+58',  flag: '🇻🇪', label: 'Venezuela' },
  { iso: 'RU', code: '+7',   flag: '🇷🇺', label: 'Russia' },
  { iso: 'UA', code: '+380', flag: '🇺🇦', label: 'Ukraine' },
  { iso: 'IR', code: '+98',  flag: '🇮🇷', label: 'Iran' },
  { iso: 'IQ', code: '+964', flag: '🇮🇶', label: 'Iraq' },
  { iso: 'JO', code: '+962', flag: '🇯🇴', label: 'Jordan' },
  { iso: 'LB', code: '+961', flag: '🇱🇧', label: 'Lebanon' },
  { iso: 'SY', code: '+963', flag: '🇸🇾', label: 'Syria' },
  { iso: 'PS', code: '+970', flag: '🇵🇸', label: 'Palestine' },
  { iso: 'YE', code: '+967', flag: '🇾🇪', label: 'Yemen' },
];

// Sort helper: longest dial codes first to avoid partial prefix matching (+971 matched before +97)
const SORTED_CODES = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

export default function PhoneInput({ value = '', onChange, name = 'phone', placeholder = '300-1234567' }) {
  const [country, setCountry] = useState('+92');
  const [localNumber, setLocalNumber] = useState('');

  useEffect(() => {
    if (!value) {
      setLocalNumber('');
      return;
    }
    
    // Attempt to split an existing full number (e.g. +92 300-1234567 or +1 415-5552671)
    let foundCode = SORTED_CODES.find(c => value.startsWith(c.code));
    if (foundCode) {
      setCountry(foundCode.code);
      let remainder = value.slice(foundCode.code.length).trim();
      setLocalNumber(formatLocal(remainder));
    } else {
      setLocalNumber(formatLocal(value));
    }
  }, [value]);

  function formatLocal(text) {
    // Strip all non-digits
    const raw = text.replace(/\D/g, '');
    if (!raw) return '';

    if (raw.startsWith('0')) {
      // Format: 0XXX-XXXXXXX
      const prefix = raw.slice(0, 4);
      const suffix = raw.slice(4, 11);
      return suffix ? `${prefix}-${suffix}` : prefix;
    } else {
      // Format: XXX-XXXXXXX
      const prefix = raw.slice(0, 3);
      const suffix = raw.slice(3, 10);
      return suffix ? `${prefix}-${suffix}` : prefix;
    }
  }

  function handleNumberChange(e) {
    const formatted = formatLocal(e.target.value);
    setLocalNumber(formatted);
    // Propagate the full number up
    const fullNumber = formatted ? `${country} ${formatted}` : '';
    onChange({ target: { name, value: fullNumber } });
  }

  function handleCountryChange(e) {
    const newCountry = e.target.value;
    setCountry(newCountry);
    const fullNumber = localNumber ? `${newCountry} ${localNumber}` : '';
    onChange({ target: { name, value: fullNumber } });
  }

  const activeCountry = COUNTRY_CODES.find(c => c.code === country) || COUNTRY_CODES[0];

  return (
    <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
      <div style={{ position: 'relative', width: '115px', flexShrink: 0 }}>
        <select 
          className="input" 
          value={country} 
          onChange={handleCountryChange}
          style={{ 
            paddingLeft: '28px', 
            paddingRight: '10px', 
            fontSize: '0.8rem', 
            cursor: 'pointer',
            height: '100%',
            fontWeight: 600
          }}
        >
          {COUNTRY_CODES.map(c => (
            <option key={`${c.iso}-${c.code}`} value={c.code}>
              {c.flag} {c.iso} ({c.code}) — {c.label}
            </option>
          ))}
        </select>
        <div style={{ position: 'absolute', top: '50%', left: '8px', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.85rem' }}>
          {activeCountry.flag}
        </div>
      </div>
      
      <input
        type="tel"
        className="input"
        placeholder={placeholder}
        value={localNumber}
        onChange={handleNumberChange}
        style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', paddingLeft: '10px', paddingRight: '10px' }}
      />
    </div>
  );
}
