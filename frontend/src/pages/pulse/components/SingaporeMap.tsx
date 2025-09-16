import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Complaint {
  id: string
  title: string
  category: string
  urgency: string
  upvote_count: number
  created_at: string
}

interface MapAreaData {
  planning_area: string
  total_complaints: number
  categories: Record<string, number>
  urgency_levels: { low: number; medium: number; high: number }
  complaints: Complaint[]
}

interface Props {
  complaints: any[]
  onComplaintSelect: (id: string) => void
}

// Singapore Planning Areas with approximate positions for visualization
const SINGAPORE_AREAS = [
  // Central Region
  { name: "Downtown Core", x: 50, y: 45, region: "Central" },
  { name: "Museum", x: 48, y: 42, region: "Central" },
  { name: "Newton", x: 45, y: 40, region: "Central" },
  { name: "Novena", x: 47, y: 38, region: "Central" },
  { name: "Orchard", x: 46, y: 41, region: "Central" },
  { name: "Outram", x: 49, y: 47, region: "Central" },
  { name: "River Valley", x: 47, y: 43, region: "Central" },
  { name: "Rochor", x: 51, y: 44, region: "Central" },
  { name: "Singapore River", x: 49, y: 45, region: "Central" },
  { name: "Tanglin", x: 44, y: 42, region: "Central" },

  // North Region
  { name: "Admiralty", x: 25, y: 15, region: "North" },
  { name: "Sembawang", x: 35, y: 10, region: "North" },
  { name: "Woodlands", x: 30, y: 5, region: "North" },
  { name: "Yishun", x: 40, y: 15, region: "North" },

  // North-East Region
  { name: "Ang Mo Kio", x: 50, y: 25, region: "North-East" },
  { name: "Hougang", x: 60, y: 25, region: "North-East" },
  { name: "Punggol", x: 70, y: 20, region: "North-East" },
  { name: "Sengkang", x: 65, y: 22, region: "North-East" },
  { name: "Serangoon", x: 55, y: 30, region: "North-East" },

  // East Region
  { name: "Bedok", x: 75, y: 50, region: "East" },
  { name: "Changi", x: 85, y: 55, region: "East" },
  { name: "Changi Bay", x: 90, y: 50, region: "East" },
  { name: "Pasir Ris", x: 80, y: 30, region: "East" },
  { name: "Tampines", x: 70, y: 40, region: "East" },

  // West Region
  { name: "Boon Lay", x: 15, y: 60, region: "West" },
  { name: "Bukit Batok", x: 25, y: 55, region: "West" },
  { name: "Bukit Panjang", x: 35, y: 50, region: "West" },
  { name: "Choa Chu Kang", x: 20, y: 45, region: "West" },
  { name: "Clementi", x: 30, y: 60, region: "West" },
  { name: "Jurong East", x: 15, y: 65, region: "West" },
  { name: "Jurong West", x: 10, y: 70, region: "West" },
  { name: "Queenstown", x: 40, y: 55, region: "West" },
  { name: "Tuas", x: 5, y: 80, region: "West" },

  // Central Region (additional)
  { name: "Bishan", x: 48, y: 35, region: "Central" },
  { name: "Bukit Merah", x: 45, y: 50, region: "Central" },
  { name: "Bukit Timah", x: 40, y: 45, region: "Central" },
  { name: "Geylang", x: 60, y: 45, region: "Central" },
  { name: "Kallang", x: 55, y: 42, region: "Central" },
  { name: "Marine Parade", x: 65, y: 52, region: "Central" },
  { name: "Toa Payoh", x: 52, y: 35, region: "Central" },
]

export default function SingaporeMap({ complaints, onComplaintSelect }: Props) {
  const [mapData, setMapData] = useState<MapAreaData[]>([])
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  const getAreaData = (areaName: string) => {
    return mapData.find(area => area.planning_area === areaName)
  }

  const getAreaIntensity = (areaName: string) => {
    const data = getAreaData(areaName)
    if (!data) return 0
    const maxComplaints = Math.max(...mapData.map(a => a.total_complaints))
    return maxComplaints === 0 ? 0 : (data.total_complaints / maxComplaints)
  }

  const getAreaColor = (areaName: string) => {
    const intensity = getAreaIntensity(areaName)
    if (intensity === 0) return '#f3f4f6' // gray-100
    if (intensity < 0.3) return '#fef3c7' // yellow-100
    if (intensity < 0.7) return '#fed7aa' // orange-200
    return '#fecaca' // red-200
  }

  const getAreaBorderColor = (areaName: string) => {
    const intensity = getAreaIntensity(areaName)
    if (intensity === 0) return '#d1d5db' // gray-300
    if (intensity < 0.3) return '#f59e0b' // yellow-500
    if (intensity < 0.7) return '#ea580c' // orange-600
    return '#dc2626' // red-600
  }

  const selectedAreaData = selectedArea ? getAreaData(selectedArea) : null

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
            Singapore Complaint Heatmap
          </CardTitle>
          <CardDescription>
            Interactive map showing complaint distribution across planning areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Map Container */}
            <div className="relative w-full h-96 bg-blue-50 rounded-lg border overflow-hidden">
              {/* Simple Singapore outline representation */}
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                style={{ background: 'linear-gradient(135deg, #e0f7ff 0%, #b3e5fc 100%)' }}
              >
                {/* Water areas */}
                <defs>
                  <pattern id="water" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#e0f7ff"/>
                    <path d="M 0,0 L 2,2 M 2,0 L 4,2" stroke="#b3e5fc" strokeWidth="0.5"/>
                  </pattern>
                </defs>

                {/* Singapore main island outline (simplified) */}
                <path
                  d="M 10,50 Q 20,30 40,25 Q 60,20 80,30 Q 90,40 85,60 Q 80,75 60,80 Q 40,85 20,75 Q 10,65 10,50 Z"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="0.5"
                  strokeDasharray="2,1"
                />

                {/* Planning areas as circles */}
                {SINGAPORE_AREAS.map((area) => {
                  const areaData = getAreaData(area.name)
                  const radius = areaData ? Math.max(1, Math.sqrt(areaData.total_complaints)) : 1

                  return (
                    <g key={area.name}>
                      <circle
                        cx={area.x}
                        cy={area.y}
                        r={Math.max(2, radius)}
                        fill={getAreaColor(area.name)}
                        stroke={getAreaBorderColor(area.name)}
                        strokeWidth="1"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedArea(area.name)}
                      />
                      {areaData && (
                        <text
                          x={area.x}
                          y={area.y + radius + 3}
                          textAnchor="middle"
                          className="text-xs fill-gray-600 pointer-events-none"
                          style={{ fontSize: '2px' }}
                        >
                          {areaData.total_complaints}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">Complaint Intensity:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                  <span className="text-xs">None</span>
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded"></div>
                  <span className="text-xs">Low</span>
                  <div className="w-4 h-4 bg-orange-200 border border-orange-600 rounded"></div>
                  <span className="text-xs">Medium</span>
                  <div className="w-4 h-4 bg-red-200 border border-red-600 rounded"></div>
                  <span className="text-xs">High</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedArea(null)}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Area Details */}
      {selectedAreaData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2">📍</span>
                {selectedArea}
              </div>
              <Badge variant="secondary">
                {selectedAreaData.total_complaints} complaints
              </Badge>
            </CardTitle>
            <CardDescription>
              Detailed view of complaints in this area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category breakdown */}
            <div>
              <h4 className="font-medium mb-2">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedAreaData.categories).map(([category, count]) => (
                  <Badge key={category} variant="outline" className="text-xs">
                    {category}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Urgency levels */}
            <div>
              <h4 className="font-medium mb-2">Urgency Levels</h4>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Low: {selectedAreaData.urgency_levels.low}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Medium: {selectedAreaData.urgency_levels.medium}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  High: {selectedAreaData.urgency_levels.high}
                </span>
              </div>
            </div>

            {/* Recent complaints */}
            <div>
              <h4 className="font-medium mb-2">Recent Complaints</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedAreaData.complaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => onComplaintSelect(complaint.id)}
                  >
                    <div className="flex justify-between items-start">
                      <h5 className="font-medium text-sm line-clamp-1">{complaint.title}</h5>
                      <div className="flex gap-1 ml-2">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {complaint.category}
                        </Badge>
                        <Badge
                          variant={complaint.urgency === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {complaint.urgency}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                      <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                      <span>👍 {complaint.upvote_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}