import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in React Leaflet

let DefaultIcon = L.divIcon({
  html: '',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'default-marker'
})

L.Marker.prototype.options.icon = DefaultIcon

interface Complaint {
  id: string
  title: string
  category: string
  subcategory?: string
  urgency: string
  status: string
  location_description?: string
  planning_area?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  sentiment_score?: number
  tags: string[]
  keywords: string[]
  upvote_count: number
  comment_count: number
  view_count: number
  created_at: string
  resolved_at?: string
}

interface MapAreaData {
  planning_area: string
  total_complaints: number
  categories: Record<string, number>
  urgency_levels: { low: number; medium: number; high: number }
  complaints: Complaint[]
}

interface Props {
  complaints: Complaint[]
}

// Create custom markers for different urgency levels
const createMarkerIcon = (urgency: string) => {
  const colors = {
    low: '#10b981', // green-500
    medium: '#f59e0b', // yellow-500
    high: '#ef4444' // red-500
  }

  const color = colors[urgency as keyof typeof colors] || colors.medium

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      ">
        ${urgency === 'high' ? '🚨' : urgency === 'medium' ? '⚠️' : '📝'}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
}

export default function SingaporeMap({ complaints }: Props) {
  const [mapData, setMapData] = useState<MapAreaData[]>([])
  const [loading, setLoading] = useState(true)

  // Singapore center coordinates
  const singaporeCenter: [number, number] = [1.3521, 103.8198]

  useEffect(() => {
    loadMapData()
  }, [])

  const loadMapData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pulse/analytics/map-data`)
      if (response.ok) {
        const data = await response.json()
        setMapData(data.map_data)
      }
    } catch (error) {
      console.error('Error loading map data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter complaints that have valid coordinates
  const complaintsWithLocation = complaints.filter(
    complaint => complaint.latitude && complaint.longitude
  )

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      transport: 'bg-blue-100 text-blue-800',
      housing: 'bg-green-100 text-green-800',
      healthcare: 'bg-red-100 text-red-800',
      environment: 'bg-emerald-100 text-emerald-800',
      education: 'bg-purple-100 text-purple-800',
      employment: 'bg-orange-100 text-orange-800',
      security: 'bg-gray-100 text-gray-800',
      general: 'bg-slate-100 text-slate-800'
    }
    return colors[category] || colors.general
  }

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
    }
    return colors[urgency] || colors.medium
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Singapore map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🗺️</span>
            Singapore Complaint Map
          </CardTitle>
          <CardDescription>
            Interactive map showing real complaint locations across Singapore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Real Singapore Map */}
            <div className="w-full h-96 rounded-lg border overflow-hidden">
              <MapContainer
                center={singaporeCenter}
                zoom={11}
                minZoom={10}
                maxZoom={18}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
                maxBounds={[
                  [1.1, 103.5], // Southwest coordinates
                  [1.5, 104.1]  // Northeast coordinates
                ]}
                maxBoundsViscosity={1.0}
              >
                {/* Use CartoDB for cleaner map appearance */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  subdomains={['a', 'b', 'c', 'd']}
                />

                {/* Clustered Markers for Performance */}
                <MarkerClusterGroup
                  chunkedLoading
                  iconCreateFunction={(cluster: any) => {
                    const count = cluster.getChildCount()
                    const markers = cluster.getAllChildMarkers()

                    // Count urgency levels in cluster
                    let highCount = 0
                    let mediumCount = 0
                    let lowCount = 0

                    markers.forEach((marker: any) => {
                      const urgency = marker.options.urgency
                      if (urgency === 'high') highCount++
                      else if (urgency === 'medium') mediumCount++
                      else lowCount++
                    })

                    // Determine cluster color based on highest urgency
                    let clusterColor = '#10b981' // green
                    if (highCount > 0) clusterColor = '#ef4444' // red
                    else if (mediumCount > 0) clusterColor = '#f59e0b' // yellow

                    return L.divIcon({
                      html: `
                        <div style="
                          background-color: ${clusterColor};
                          color: white;
                          border-radius: 50%;
                          width: 40px;
                          height: 40px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-weight: bold;
                          border: 3px solid white;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        ">
                          ${count}
                        </div>
                      `,
                      className: 'marker-cluster',
                      iconSize: [40, 40],
                      iconAnchor: [20, 20]
                    })
                  }}
                >
                  {/* Plot actual complaints with real coordinates */}
                  {complaintsWithLocation.map((complaint) => (
                    <Marker
                      key={complaint.id}
                      position={[complaint.latitude!, complaint.longitude!]}
                      icon={createMarkerIcon(complaint.urgency)}
                      // Add urgency to marker options for clustering
                      // @ts-ignore
                      urgency={complaint.urgency}
                    >
                      <Popup>
                        <div className="min-w-[250px] p-2">
                          <h3 className="font-medium mb-2 line-clamp-2">{complaint.title}</h3>

                          <div className="flex gap-2 mb-2">
                            <Badge className={getCategoryColor(complaint.category)} variant="secondary">
                              {complaint.category}
                            </Badge>
                            <Badge className={getUrgencyColor(complaint.urgency)} variant="secondary">
                              {complaint.urgency}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600 mb-2">
                            {complaint.planning_area && (
                              <p><strong>Area:</strong> {complaint.planning_area}</p>
                            )}
                            {complaint.location_description && (
                              <p><strong>Location:</strong> {complaint.location_description}</p>
                            )}
                            <p><strong>Date:</strong> {new Date(complaint.created_at).toLocaleDateString()}</p>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                            <span>👍 {complaint.upvote_count}</span>
                            <span>💬 {complaint.comment_count}</span>
                            <span>👁️ {complaint.view_count}</span>
                          </div>

                          {complaint.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {complaint.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            </div>

            {/* Map Stats and Legend */}
            <div className="mt-4 space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">Urgency Levels:</span>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <span className="text-xs">Low</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs">Medium</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      <span className="text-xs">High</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{complaintsWithLocation.length}</span> complaints with location data
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Reset View
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 border-t pt-2">
                <div className="flex items-center space-x-1">
                  <span>📍</span>
                  <span>Individual complaints</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gray-400 rounded-full text-white text-xs flex items-center justify-center" style={{fontSize: '8px'}}>5</div>
                  <span>Clustered complaints (click to zoom)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🔍</span>
                  <span>Click markers for details</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planning Area Statistics */}
      {mapData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">📊</span>
              Planning Area Statistics
            </CardTitle>
            <CardDescription>
              Complaint distribution across Singapore's planning areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
              {mapData
                .sort((a, b) => b.total_complaints - a.total_complaints)
                .slice(0, 12)
                .map((area) => (
                <div
                  key={area.planning_area}
                  className="p-3 border rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{area.planning_area}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {area.total_complaints}
                    </Badge>
                  </div>

                  <div className="flex gap-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {area.urgency_levels.low}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      {area.urgency_levels.medium}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      {area.urgency_levels.high}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="text-xs text-gray-500">
                      Top: {Object.entries(area.categories)
                        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}