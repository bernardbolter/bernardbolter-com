'use client'
import React, { useState, useEffect } from 'react'
import { useField, Button } from '@payloadcms/ui'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'

/**
 * 1. Dynamically import Leaflet components with SSR disabled.
 */
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

/**
 * 2. ClickHandler Component
 */
const ClickHandler = ({ setStaged, staged, icon }: any) => {
  const { useMapEvents } = require('react-leaflet')
  useMapEvents({
    click(e: any) {
      setStaged({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return staged ? <Marker position={[staged.lat, staged.lng]} icon={icon} /> : null
}

export const MapField: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false)
  const [L, setL] = useState<any>(null)
  const [staged, setStaged] = useState<{ lat: number; lng: number } | null>(null)

  /**
   * 3. Hook into specific fields. 
   * setValue(val) automatically notifies the form that data has changed,
   * which enables the global 'Save' button.
   */
  const { value: existingLat, setValue: setLat } = useField<number>({ path: 'lat' })
  const { value: existingLng, setValue: setLng } = useField<number>({ path: 'lng' })

  useEffect(() => {
    setIsMounted(true)
    import('leaflet').then((leaflet) => {
      setL(leaflet.default)
    })
  }, [])

  const handleApply = () => {
    if (staged) {
      const latVal = parseFloat(staged.lat.toFixed(6))
      const lngVal = parseFloat(staged.lng.toFixed(6))

      // Direct updates to field values
      setLat(latVal)
      setLng(lngVal)

      setStaged(null)
    }
  }

  if (!isMounted || !L) {
    return (
      <div style={{ padding: '20px', border: '1px solid #333', borderRadius: '6px', color: '#666' }}>
        Initializing Map Interface...
      </div>
    )
  }

  const BERLIN: [number, number] = [52.52, 13.405]
  const initialCenter = existingLat && existingLng ? [existingLat, existingLng] : BERLIN
  const initialZoom = existingLat && existingLng ? 15 : 12

  const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })

  return (
    <div style={{ marginBottom: '25px', marginTop: '10px' }}>
      <p style={{ 
        display: 'block', 
        marginBottom: '10px', 
        fontSize: '11px', 
        fontWeight: '600', 
        letterSpacing: '1px',
        color: '#9a9a9a',
        textTransform: 'uppercase'
      }}>
        Geography & Map Picker
      </p>
      
      <div style={{ 
        height: '400px', 
        width: '100%', 
        marginBottom: '15px', 
        borderRadius: '6px', 
        overflow: 'hidden', 
        border: '1px solid #333',
        position: 'relative',
        zIndex: 0
      }}>
        <MapContainer 
          center={initialCenter as [number, number]} 
          zoom={initialZoom} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer 
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          />
          
          <ClickHandler setStaged={setStaged} staged={staged} icon={icon} />
          
          {!staged && existingLat && existingLng && (
            <Marker position={[existingLat, existingLng]} icon={icon} />
          )}
        </MapContainer>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: '#121212',
        padding: '12px 16px',
        borderRadius: '4px',
        border: '1px solid #222'
      }}>
        <div style={{ fontSize: '13px' }}>
          {staged ? (
            <span style={{ color: '#409eff' }}>New Selection: <strong>{staged.lat.toFixed(4)}, {staged.lng.toFixed(4)}</strong></span>
          ) : existingLat ? (
            <span style={{ color: '#999' }}>Stored: <strong>{existingLat.toFixed(4)}, {existingLng.toFixed(4)}</strong></span>
          ) : (
            <span style={{ color: '#666' }}>Click map to select a point</span>
          )}
        </div>
        
        <Button 
          size="small" 
          onClick={handleApply} 
          disabled={!staged}
        >
          Apply to Artwork
        </Button>
      </div>
    </div>
  )
}