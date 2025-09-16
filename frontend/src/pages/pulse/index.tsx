import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import SingaporeMap from './components/SingaporeMap'
import ComplaintsList from './components/ComplaintsList'
import AnalyticsOverview from './components/AnalyticsOverview'

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

interface AnalyticsData {
  total_complaints: number
  category_breakdown: Record<string, number>
  location_breakdown: Record<string, number>
  average_sentiment: number
  daily_trend: { date: string; count: number }[]
  period_days: number
}

export default function PulseDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'complaints'>('overview')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load analytics data
      const analyticsResponse = await fetch(`${import.meta.env.VITE_API_URL}/pulse/analytics/overview?days=30`)
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData)
      }

      // Load recent complaints
      const complaintsResponse = await fetch(`${import.meta.env.VITE_API_URL}/pulse/complaints?limit=50`)
      if (complaintsResponse.ok) {
        const complaintsData = await complaintsResponse.json()
        setComplaints(complaintsData.complaints)
      }

    } catch (error) {
      console.error('Error loading Pulse data:', error)
    } finally {
      setLoading(false)
    }
  }

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
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
    }
    return colors[urgency] || colors.medium
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">Loading Singapore Pulse...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header */}
      <div className="border-b border-red-100 bg-white/80 backdrop-blur shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <span className="mr-3">🇸🇬</span>
                PulseSG
                <span className="ml-3">📊</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time insights into Singapore's community concerns and feedback
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'outline'}
                onClick={() => setActiveTab('overview')}
                className="text-sm"
              >
                Overview
              </Button>
              <Button
                variant={activeTab === 'map' ? 'default' : 'outline'}
                onClick={() => setActiveTab('map')}
                className="text-sm"
              >
                Map View
              </Button>
              <Button
                variant={activeTab === 'complaints' ? 'default' : 'outline'}
                onClick={() => setActiveTab('complaints')}
                className="text-sm"
              >
                All Complaints
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            <AnalyticsOverview analytics={analytics} />

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Complaints */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">📝</span>
                    Recent Complaints
                  </CardTitle>
                  <CardDescription>
                    Latest feedback from the community
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {complaints.slice(0, 10).map((complaint) => (
                      <div
                        key={complaint.id}
                        className="p-3 rounded-lg border bg-white/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800 line-clamp-2">
                              {complaint.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {complaint.planning_area || 'Singapore'} • {new Date(complaint.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 ml-3">
                            <Badge className={getCategoryColor(complaint.category)} variant="secondary">
                              {complaint.category}
                            </Badge>
                            <Badge className={getUrgencyColor(complaint.urgency)} variant="secondary">
                              {complaint.urgency}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>👍 {complaint.upvote_count}</span>
                          <span>💬 {complaint.comment_count}</span>
                          <span>👁️ {complaint.view_count}</span>
                        </div>

                        {complaint.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
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
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">📈</span>
                    Community Impact
                  </CardTitle>
                  <CardDescription>
                    How Singapore voices are making a difference
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Voices Heard</p>
                        <p className="text-2xl font-bold text-blue-700">{analytics.total_complaints}</p>
                      </div>
                      <div className="text-3xl">🗣️</div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Community Sentiment</p>
                        <p className="text-2xl font-bold text-green-700">
                          {analytics.average_sentiment > 0 ? 'Positive' : analytics.average_sentiment < 0 ? 'Concerned' : 'Neutral'}
                        </p>
                      </div>
                      <div className="text-3xl">
                        {analytics.average_sentiment > 0 ? '😊' : analytics.average_sentiment < 0 ? '😟' : '😐'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Top Category</p>
                        <p className="text-lg font-bold text-orange-700 capitalize">
                          {Object.entries(analytics.category_breakdown)
                            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'General'}
                        </p>
                      </div>
                      <div className="text-3xl">🏆</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <SingaporeMap
            complaints={complaints}
          />
        )}

        {/* Complaints List Tab */}
        {activeTab === 'complaints' && (
          <ComplaintsList
            complaints={complaints}
            getCategoryColor={getCategoryColor}
            getUrgencyColor={getUrgencyColor}
          />
        )}
      </div>

    </div>
  )
}