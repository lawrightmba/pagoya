export default function PagoYaLogo({ className = "h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 50"
      className={className}
      aria-label="PagoYa"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="4" width="42" height="42" rx="10" fill="#046C2C" />
      <text x="21" y="33" textAnchor="middle" fontSize="26" fontWeight="900" fill="white" fontFamily="system-ui, sans-serif">P</text>
      <text x="55" y="36" fontSize="26" fontWeight="800" fill="#046C2C" fontFamily="system-ui, sans-serif">ago</text>
      <text x="108" y="36" fontSize="26" fontWeight="800" fill="#39A935" fontFamily="system-ui, sans-serif">Ya</text>
      <circle cx="162" cy="12" r="7" fill="#E21A0A" />
      <text x="162" y="16.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" fontFamily="system-ui, sans-serif">MX</text>
    </svg>
  );
}
