'use client'

const ORB_COLORS = [
  'var(--series-sold)',
  'var(--series-war)',
  'var(--series-ach)',
  'var(--series-meg)',
  'var(--series-van)',
  'var(--series-pho)',
]

const ORB_ANIMATIONS = [
  'float1 20s ease-in-out infinite',
  'float2 25s ease-in-out infinite',
  'float3 22s ease-in-out infinite',
  'float4 18s ease-in-out infinite',
  'float1 23s ease-in-out infinite 2s',
  'float2 21s ease-in-out infinite 3s',
]

const ORB_POSITIONS = [
  { top: '20%', left: '10%', size: 600 },
  { top: '50%', right: '15%', size: 500 },
  { bottom: '15%', left: '20%', size: 550 },
  { top: '30%', right: '25%', size: 480 },
  { bottom: '25%', right: '10%', size: 520 },
  { top: '40%', left: '30%', size: 450 },
]

interface LoadingProps {
  title?: string
  subtitle?: string
}

export default function Loading({ title = 'Loading...', subtitle }: LoadingProps) {
  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center overflow-hidden bg-surface-page">
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30vw, -20vh) scale(1.2); }
          66% { transform: translate(-20vw, 30vh) scale(0.9); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25vw, 25vh) scale(0.8); }
          66% { transform: translate(35vw, -15vh) scale(1.3); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20vw, 30vh) scale(1.1); }
          66% { transform: translate(-30vw, -20vh) scale(0.85); }
        }
        @keyframes float4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-15vw, -25vh) scale(1.15); }
          66% { transform: translate(25vw, 20vh) scale(0.95); }
        }
      `}</style>

      {ORB_POSITIONS.map((orb, index) => (
        <div
          key={index}
          className="absolute rounded-full blur-[4.375rem]"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${ORB_COLORS[index]}33 0%, transparent 70%)`,
            animation: ORB_ANIMATIONS[index],
            ...orb,
          }}
        />
      ))}

      <div className="relative z-nav text-center">
        <h1 className="m-0 font-heading text-[1.75rem] font-bold uppercase tracking-[0.25rem] text-dark">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-space-2 font-heading text-base tracking-[0.125rem] text-secondary">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
