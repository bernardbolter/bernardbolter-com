'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { Icon, LeafletMouseEvent } from 'leaflet'

import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
})
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
})
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false })

const BERLIN: [number, number] = [52.52, 13.405]

export type StudioMapLocation = { lat: number; lng: number }

type StudioLocationMapProps = {
  value: StudioMapLocation | null
  onChange: (next: StudioMapLocation) => void
  disabled?: boolean
}

function MapClickHandler({
  onPick,
  disabled,
}: {
  onPick: (next: StudioMapLocation) => void
  disabled?: boolean
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMapEvents } = require('react-leaflet') as typeof import('react-leaflet')
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (disabled) return
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export function StudioLocationMap({ value, onChange, disabled }: StudioLocationMapProps) {
  const [mounted, setMounted] = useState(false)
  const [icon, setIcon] = useState<Icon | null>(null)

  useEffect(() => {
    setMounted(true)
    void import('leaflet').then((leaflet) => {
      setIcon(
        leaflet.default.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        }),
      )
    })
  }, [])

  if (!mounted || !icon) {
    return <p className="studio-muted">Loading map…</p>
  }

  const center: [number, number] = value ? [value.lat, value.lng] : BERLIN
  const zoom = value ? 15 : 12

  return (
    <div className="studio-location-map">
      <div className="studio-location-map__canvas">
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler
            disabled={disabled}
            onPick={(next) =>
              onChange({
                lat: Number(next.lat.toFixed(6)),
                lng: Number(next.lng.toFixed(6)),
              })
            }
          />
          {value ? <Marker position={[value.lat, value.lng]} icon={icon} /> : null}
        </MapContainer>
      </div>
      <p className="studio-location-map__coords">
        {value
          ? `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`
          : 'Click the map to drop a pin'}
      </p>
    </div>
  )
}
