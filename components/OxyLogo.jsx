// OXY xrom wordmark — logotipdagi 3D metall "OXY" shriftiga moslangan
// (CSS gradient + drop-shadow, sayt shrifti Manrope 800 bilan).
//
// size: kegel (px). className: qo'shimcha joylashuv klasslari.
export default function OxyLogo({ size = 20, className = '' }) {
  return (
    <span className={`oxy-logo ${className}`} aria-label="OXY" role="img">
      <span className="oxy-wordmark" style={{ fontSize: `${size}px` }}>
        OXY
      </span>
    </span>
  );
}
