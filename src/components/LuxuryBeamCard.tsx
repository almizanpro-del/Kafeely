import React from 'react';

interface LuxuryBeamCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  hasBorderBeam?: boolean;
  hasLightBeam?: boolean;
  beamSpeed?: 'normal' | 'slow';
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * LuxuryBeamCard
 * Renders an ultra-premium card with a luminous gold travelling border beam
 * and an ambient interior light beam that gently drifts across the surface.
 */
export const LuxuryBeamCard: React.FC<LuxuryBeamCardProps> = ({
  children,
  className = '',
  innerClassName = '',
  hasBorderBeam = true,
  hasLightBeam = true,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl p-[1.5px] overflow-hidden group shadow-[0_15px_40px_rgba(0,0,0,0.6)] ${className}`}
    >
      {/* 1. Traveling Border Line (Light Beam rotating around the card perimeter) */}
      {hasBorderBeam && (
        <div
          aria-hidden="true"
          className="absolute inset-[-150%] animate-border-beam pointer-events-none select-none"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 65deg, rgba(197,168,128,0.2) 100deg, #E8D7B8 145deg, #FFFFFF 165deg, #C5A880 185deg, rgba(197,168,128,0.15) 215deg, transparent 260deg, transparent 360deg)',
          }}
        />
      )}

      {/* Static luxury subtle border fall-through to preserve shape */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl border border-[#C5A880]/30 pointer-events-none"
      />

      {/* 2. Inner Card Content Surface */}
      <div
        className={`relative h-full w-full rounded-[calc(1rem-1.5px)] bg-[#0B132B]/95 backdrop-blur-xl overflow-hidden ${innerClassName}`}
      >
        {/* 3. Internal Light Beam drifting inside the card */}
        {hasLightBeam && (
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -start-24 h-72 w-72 rounded-full bg-gradient-to-br from-[#E8D7B8]/15 via-[#C5A880]/10 to-transparent blur-3xl animate-light-beam" />
            <div className="absolute -bottom-20 -end-20 h-64 w-64 rounded-full bg-gradient-to-tl from-[#C5A880]/10 to-transparent blur-2xl pointer-events-none" />
          </div>
        )}

        {/* Children content */}
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </div>
  );
};
