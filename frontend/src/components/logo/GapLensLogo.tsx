/**
 * GapLens AI — Brand Identity Logo
 *
 * CONCEPT: Document (Information) + Magnifying Lens (Investigation) + Missing Notch (Information Gap)
 *
 * 1. Document Page: Crisp 2D document silhouette with folded corner and content lines.
 * 2. Missing Notch: A distinct square cut-out on the document edge representing an information dark spot.
 * 3. Magnifying Lens: A classic, unmistakable optical lens with angled handle inspecting the missing gap.
 * 4. Tagline: "Intelligence begins where information ends."
 */

import { SVGProps } from 'react';
import { clsx } from 'clsx';

const TEAL = '#087F83';
const TEAL_DARK = '#075B60';
const GOLD = '#D59A55';
const NAVY = '#111C25';
const WHITE = '#FFFFFF';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  theme?: 'dark' | 'light' | 'color';
}

/**
 * Clean, recognizable, static 2D vector brand mark
 */
export const GapLensIcon = ({ size = 36, theme = 'color', className, ...rest }: IconProps) => {
  const isLight = theme === 'light';
  const docFill = isLight ? '#EBF0F3' : '#142531';
  const docStroke = isLight ? '#8B9BA5' : '#087F83';
  const lineStroke = isLight ? '#8B9BA5' : '#2A4D60';
  const handleColor = isLight ? '#111C25' : '#E8EEF2';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="GapLens AI Logo: Document with missing gap inspected by magnifying lens"
      className={clsx('shrink-0 select-none', className)}
      {...rest}
    >
      {/* ── 1. Document Page with Top-Right Fold & Right Edge Missing Notch ── */}
      {/* Document outline with notch at (x: 21 to 31, y: 19 to 29) */}
      <path
        d="M 10 5 H 24 L 32 13 V 19 H 21 V 29 H 32 V 41 C 32 42.1 31.1 43 30 43 H 10 C 8.9 43 8 42.1 8 41 V 7 C 8 5.9 8.9 5 10 5 Z"
        fill={docFill}
        stroke={docStroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Folded Top-Right Corner */}
      <path
        d="M 24 5 V 13 H 32"
        fill={isLight ? '#D3DDE3' : '#1C3647'}
        stroke={docStroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Content lines representing written text */}
      <line x1="12" y1="13" x2="20" y2="13" stroke={lineStroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="18" y2="18" stroke={lineStroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="24" x2="17" y2="24" stroke={lineStroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="35" x2="26" y2="35" stroke={lineStroke} strokeWidth="2" strokeLinecap="round" />

      {/* ── 2. The Missing Information Gap (Dashed Outline & Gold Accent) ── */}
      <rect
        x="21"
        y="19"
        width="10"
        height="10"
        rx="1.5"
        fill="none"
        stroke={GOLD}
        strokeWidth="1.6"
        strokeDasharray="2 2"
      />
      {/* Floating gold discovery piece indicating identified gap */}
      <rect
        x="36"
        y="8"
        width="5"
        height="5"
        rx="1"
        fill={GOLD}
      />

      {/* ── 3. Magnifying Investigation Lens ── */}
      {/* Lens Glass (transparent tinted circular aperture) */}
      <circle
        cx="27"
        cy="25"
        r="9.5"
        fill="rgba(8, 127, 131, 0.16)"
        stroke={TEAL}
        strokeWidth="2.5"
      />

      {/* Glass Light Reflection Arc */}
      <path
        d="M 21 21 C 23 18 27 17 31 19"
        stroke={WHITE}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Magnifying Glass Handle pointing down-right */}
      <line
        x1="34"
        y1="32"
        x2="43"
        y2="41"
        stroke={handleColor}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* Metallic Gold Collar on Handle */}
      <line
        x1="33.5"
        y1="31.5"
        x2="36"
        y2="34"
        stroke={GOLD}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Standard Wordmark Lockup: Logo + Text + Optional Tagline
// ────────────────────────────────────────────────────────────────────────────
interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  showTagline?: boolean;
  className?: string;
}

const iconSizeMap = { xs: 24, sm: 30, md: 36, lg: 44, xl: 52 };
const textSizeMap = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export const GapLensLogo = ({
  size = 'md',
  theme = 'dark',
  showTagline,
  className,
}: LogoProps) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-[#17252B]';
  const subColor = isDark ? 'text-white/60' : 'text-[#687579]';
  const iconTheme = isDark ? 'dark' : 'light';

  return (
    <div className={clsx('flex items-center gap-3 select-none', className)}>
      <GapLensIcon size={iconSizeMap[size]} theme={iconTheme} />
      <div className="flex flex-col">
        <span className={clsx('font-black tracking-tight leading-none', textSizeMap[size], textColor)}>
          Gap<span style={{ color: TEAL }}>Lens</span>
          <span className="font-semibold text-xs ml-1 px-1.5 py-0.5 rounded bg-teal/15 text-teal border border-teal/30 align-middle">
            AI
          </span>
        </span>
        {showTagline && (
          <span className={clsx('text-[10px] uppercase tracking-[0.14em] font-semibold mt-1', subColor)}>
            Intelligence begins where information ends
          </span>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Sidebar Compact Version
// ────────────────────────────────────────────────────────────────────────────
export const GapLensSidebarLogo = ({ collapsed = false }: { collapsed?: boolean }) => (
  <div className={clsx('flex items-center select-none', collapsed ? 'justify-center w-full' : 'gap-3')}>
    <GapLensIcon size={30} theme="dark" />
    {!collapsed && (
      <div className="leading-tight">
        <span className="font-black text-lg text-white tracking-tight">
          Gap<span style={{ color: TEAL }}>Lens</span>
          <span className="font-semibold text-xs ml-1 px-1.5 py-0.5 rounded bg-teal/20 text-teal border border-teal/40">
            AI
          </span>
        </span>
        <p className="text-[10px] text-white/50 font-medium mt-0.5">
          Research Intelligence
        </p>
      </div>
    )}
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Landing Page Hero Mark
// ────────────────────────────────────────────────────────────────────────────
export const GapLensHeroMark = ({ className }: { className?: string }) => (
  <div className={clsx('flex items-center gap-3 select-none', className)}>
    <GapLensIcon size={40} theme="dark" />
    <div className="leading-tight">
      <div className="font-black text-2xl text-white tracking-tight">
        Gap<span style={{ color: TEAL }}>Lens</span>
        <span className="font-semibold text-xs ml-1 px-1.5 py-0.5 rounded bg-teal/20 text-teal border border-teal/40 align-middle">
          AI
        </span>
      </div>
      <div className="text-[10px] text-white/60 font-semibold tracking-wider mt-0.5" style={{ color: GOLD }}>
        Information Gap Detection
      </div>
    </div>
  </div>
);
