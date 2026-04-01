import React from "react";

/**
 * Data-loading UI using the app icon with rotation.
 * Use while a screen fetches after navigation or on first paint.
 *
 * @param {object} props
 * @param {string} [props.message] - Optional text below the icon
 * @param {number} [props.size] - Icon size in px (default 72)
 * @param {'inline' | 'section' | 'fullscreen'} [props.variant] - Layout: inline block, centered section (default), or full-viewport overlay
 * @param {string} [props.className] - Extra classes on the outer wrapper
 * @param {string} [props.iconSrc] - Override icon URL (default `/icon.png` from public/)
 * @param {number} [props.spinDurationMs] - Full rotation duration in ms (default 1200)
 * @param {boolean} [props.tintBlue] - Apply brand-blue tint to the icon (default true)
 */
export default function RouteDataLoading({
  message,
  size = 56,
  variant = "section",
  className = "",
  iconSrc = "/icon.png",
  spinDurationMs = 1200,
  tintBlue = true,
}) {
  const base = "flex flex-col items-center justify-center gap-4";
  const variantClass =
    variant === "fullscreen"
      ? "fixed inset-0 z-50 bg-white/90 backdrop-blur-[2px] min-h-screen"
      : variant === "inline"
        ? "py-6"
      : "min-h-[55vh] py-16";

  return (
    <div
      className={`${base} ${variantClass} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <img
        src={iconSrc}
        alt=""
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        style={{
          animationDuration: `${spinDurationMs}ms`,
          // Brand-blue tint for a monochrome PNG icon
          filter: tintBlue
            ? "brightness(0) saturate(100%) invert(19%) sepia(23%) saturate(1995%) hue-rotate(176deg) brightness(93%) contrast(92%)"
            : undefined,
        }}
        className="animate-spin object-contain select-none motion-reduce:animate-none"
      />
      {message ? (
        <p className="text-sm text-slate-600 text-center max-w-sm px-4">{message}</p>
      ) : null}
    </div>
  );
}
