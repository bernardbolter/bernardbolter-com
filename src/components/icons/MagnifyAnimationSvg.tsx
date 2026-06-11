'use client'

type Props = {
  enlargeArtwork: boolean
  color?: string
  stroke?: number
}

export default function MagnifyAnimationSvg({
  enlargeArtwork,
  color = 'currentColor',
  stroke = 1.6,
}: Props) {
  return (
    <svg viewBox="0 0 40 40" role="img" aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="12"
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="25"
        y1="25"
        x2="30"
        y2="30"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <g transform="translate(16,16)">
        <rect x={-6} y={-stroke / 2} width={12} height={stroke} rx={stroke / 2} fill={color} />
        <rect
          x={-stroke / 2}
          y={-6}
          width={stroke}
          height={12}
          rx={stroke / 2}
          fill={color}
          style={{
            transformOrigin: 'center',
            transform: enlargeArtwork ? 'scaleY(0.08)' : 'scaleY(1)',
            opacity: enlargeArtwork ? 0 : 1,
            transition: 'transform 220ms ease, opacity 180ms ease',
          }}
        />
      </g>
    </svg>
  )
}
