import React from 'react';

interface CompanyLogoProps {
  type: 'bytedance' | 'ant' | 'xiaomi' | 'amazon' | 'custom';
  name: string;
  className?: string;
  customColor?: string;
}

export default function CompanyLogo({ type, name, className = "w-12 h-12", customColor }: CompanyLogoProps) {
  // Use unique background styling based on types matching the screenshot
  switch (type) {
    case 'bytedance':
      return (
        <div className={`relative ${className} flex items-center justify-center bg-gray-50 border border-gray-100 rounded-xl overflow-hidden p-1.5 shrink-0 shadow-sm`}>
          {/* ByteDance stylized teal/blue dynamic logo */}
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="#F4FBFB" />
            <path d="M12 10V30H16V22H24V30H28V10H24V18H16V10H12Z" fill="#00B5E2" fillOpacity="0.15" />
            <rect x="14" y="12" width="4" height="16" rx="2" fill="#00D2C4" />
            <rect x="22" y="12" width="4" height="16" rx="2" fill="#3854FF" />
            <rect x="18" y="18" width="4" height="4" rx="1" fill="#4B6DFE" />
          </svg>
          <span className="absolute bottom-[2px] right-[2px] bg-sky-600 text-white rounded-sm text-[10px] scale-[0.65] px-1 font-bold">3</span>
        </div>
      );

    case 'ant':
      return (
        <div className={`relative ${className} flex items-center justify-center bg-[#154E4A] rounded-xl overflow-hidden p-1.5 shrink-0 shadow-sm`}>
          {/* Ant Group elegant blue-teal globe */}
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="14" stroke="#4ECDC4" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="20" cy="20" r="10" fill="url(#ant-gradient)" />
            <path d="M13 20C13 16.134 16.134 13 20 13C23.866 13 27 16.134 27 20" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="ant-gradient" x1="10" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#25A59A" />
                <stop offset="100%" stopColor="#0B2F2D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      );

    case 'xiaomi':
      return (
        <div className={`relative ${className} flex items-center justify-center bg-[#141518] rounded-xl overflow-hidden p-1.5 shrink-0 shadow-sm border border-gray-800`}>
          {/* Xiaomi premium high-contrast dark square logo with red accent shown in image */}
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="6" width="28" height="28" rx="6" fill="#1C1D22" />
            <circle cx="20" cy="20" r="5" fill="#FF5C00" className="animate-pulse" />
            <path d="M12 28L18 12M28 28L22 12" stroke="#4A4B50" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'amazon':
      return (
        <div className={`relative ${className} flex items-center justify-center bg-[#FDFDFD] border border-gray-100 rounded-xl overflow-hidden p-1.5 shrink-0 shadow-sm`}>
          {/* Amazon custom smile logo and curve shown in image */}
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 24C15.5 28.5 24.5 28.5 30 24" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M28 22.5L30.5 24.5L29.5 21" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 19C17 16 19 14.5 21 14.5C23 14.5 25 16 25 19" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
            <circle cx="15" cy="18" r="1.5" fill="#333333" />
            <circle cx="25" cy="18" r="1.5" fill="#333333" />
          </svg>
        </div>
      );

    default:
      // Pretty fallback with initials
      const initLetters = name ? name.substring(0, 2).trim().toUpperCase() : 'JD';
      const bgColor = customColor || '#006A65';
      return (
        <div 
          className={`relative ${className} flex items-center justify-center rounded-xl overflow-hidden shrink-0 shadow-sm select-none border border-black/5 text-white font-bold tracking-wider text-xs font-sans`}
          style={{ backgroundColor: bgColor }}
        >
          {initLetters}
        </div>
      );
  }
}
