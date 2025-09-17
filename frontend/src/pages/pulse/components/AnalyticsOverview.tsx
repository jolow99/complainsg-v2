import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AnalyticsData {
  total_complaints: number
  category_breakdown: Record<string, number>
  location_breakdown: Record<string, number>
  average_sentiment: number
  daily_trend: { date: string; count: number }[]
  period_days: number
}

interface Props {
  analytics: AnalyticsData
}

export default function AnalyticsOverview({ analytics }: Props) {
  // Get top categories
  const topCategories = Object.entries(analytics.category_breakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  // Get top locations
  const topLocations = Object.entries(analytics.location_breakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  // Simple trend indicator
  const recentTrend = analytics.daily_trend.slice(-7)
  const trendDirection = recentTrend.length >= 2 ?
    recentTrend[recentTrend.length - 1].count - recentTrend[0].count : 0

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Complaints */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Complaints
          </CardTitle>
          <div className="text-2xl">📊</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.total_complaints.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Past {analytics.period_days} days
          </p>
        </CardContent>
      </Card>

      {/* Trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Weekly Trend
          </CardTitle>
          <div className="text-2xl">
            {trendDirection > 0 ? '📈' : trendDirection < 0 ? '📉' : '➡️'}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            trendDirection > 0 ? 'text-red-600' :
            trendDirection < 0 ? 'text-green-600' : 'text-gray-600'
          }`}>
            {trendDirection > 0 ? '+' : ''}{trendDirection}
          </div>
          <p className="text-xs text-muted-foreground">
            Change from last week
          </p>
        </CardContent>
      </Card>

      {/* Average Sentiment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Community Mood
          </CardTitle>
          <div className="text-2xl">
            {analytics.average_sentiment > 0.1 ? '😊' :
             analytics.average_sentiment < -0.1 ? '😟' : '😐'}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            analytics.average_sentiment > 0.1 ? 'text-green-600' :
            analytics.average_sentiment < -0.1 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {analytics.average_sentiment > 0.1 ? 'Positive' :
             analytics.average_sentiment < -0.1 ? 'Concerned' : 'Neutral'}
          </div>
          <p className="text-xs text-muted-foreground">
            Score: {analytics.average_sentiment.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Top Category */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Top Category
          </CardTitle>
          <div className="text-2xl">🏆</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">
            {topCategories[0]?.[0] || 'General'}
          </div>
          <p className="text-xs text-muted-foreground">
            {topCategories[0]?.[1] || 0} complaints
          </p>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">📂</span>
            Categories
          </CardTitle>
          <CardDescription>
            Breakdown by complaint type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCategories.map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={getCategoryColor(category)} variant="secondary">
                    {category}
                  </Badge>
                  <span className="text-sm text-gray-600 capitalize">{category}</span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Location Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🗺️</span>
            Top Areas
          </CardTitle>
          <CardDescription>
            Most active planning areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topLocations.map(([location, count]) => (
              <div key={location} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{location}</span>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}