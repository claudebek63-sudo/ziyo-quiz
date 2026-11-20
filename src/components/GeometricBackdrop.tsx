export function GeometricBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden bg-gradient-to-br from-[#461A42] via-[#3A1437] to-[#2D0F2B]"
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.08]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="ziyo-geo-grid"
            width="160"
            height="160"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 80 12 L 148 80 L 80 148 L 12 80 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />
            <circle cx="80" cy="80" r="24" fill="none" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="0" cy="0" r="14" fill="none" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="160" cy="0" r="14" fill="none" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="0" cy="160" r="14" fill="none" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="160" cy="160" r="14" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ziyo-geo-grid)" />
      </svg>

      <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#8854C0]/20 blur-3xl" />
      <div className="absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full bg-[#D946EF]/15 blur-3xl" />
    </div>
  );
}
