import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  sentiment_score?: number
  tags: string[]
  keywords: string[]
  upvote_count: number
  comment_count: number
  view_count: number
  created_at: string
  resolved_at?: string
}

interface Props {
  complaints: Complaint[]
  getCategoryColor: (category: string) => string
  getUrgencyColor: (urgency: string) => string
}

export default function ComplaintsList({
  complaints,
  getCategoryColor,
  getUrgencyColor
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedUrgency, setSelectedUrgency] = useState<string>('')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'discussed'>('recent')

  // Get unique categories
  const categories = [...new Set(complaints.map(c => c.category))]

  // Filter complaints
  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = searchTerm === '' ||
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (complaint.planning_area && complaint.planning_area.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === '' || complaint.category === selectedCategory
    const matchesUrgency = selectedUrgency === '' || complaint.urgency === selectedUrgency

    return matchesSearch && matchesCategory && matchesUrgency
  })

  // Sort complaints
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.upvote_count - a.upvote_count
      case 'discussed':
        return b.comment_count - a.comment_count
      case 'recent':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const getSentimentIcon = (score?: number) => {
    if (!score) return '😐'
    if (score > 0.1) return '😊'
    if (score < -0.1) return '😟'
    return '😐'
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🔍</span>
            Search & Filter
          </CardTitle>
          <CardDescription>
            Find specific complaints or browse by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <Input
              placeholder="Search complaints, tags, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />

            {/* Category Filter */}
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category} className="capitalize">
                  {category}
                </option>
              ))}
            </select>

            {/* Urgency Filter */}
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
            >
              <option value="">All Urgency</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm font-medium">Sort by:</span>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('recent')}
              >
                Recent
              </Button>
              <Button
                variant={sortBy === 'popular' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('popular')}
              >
                Popular
              </Button>
              <Button
                variant={sortBy === 'discussed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('discussed')}
              >
                Most Discussed
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="text-sm text-gray-600 mt-4">
            Showing {sortedComplaints.length} of {complaints.length} complaints
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      <div className="space-y-4">
        {sortedComplaints.map((complaint) => (
          <Card
            key={complaint.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {complaint.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(complaint.category)} variant="secondary">
                      {complaint.category}
                    </Badge>
                    <Badge className={getUrgencyColor(complaint.urgency)} variant="secondary">
                      {complaint.urgency}
                    </Badge>
                    {complaint.status === 'resolved' && (
                      <Badge className="bg-green-100 text-green-800" variant="secondary">
                        ✅ Resolved
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="text-2xl">
                    {getSentimentIcon(complaint.sentiment_score)}
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    {complaint.planning_area && (
                      <div>📍 {complaint.planning_area}</div>
                    )}
                    <div>{new Date(complaint.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Location */}
              {complaint.location_description && (
                <p className="text-sm text-gray-600 mb-3">
                  📍 {complaint.location_description}
                </p>
              )}

              {/* Tags */}
              {complaint.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {complaint.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {complaint.tags.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      +{complaint.tags.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span>👍</span>
                    {complaint.upvote_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <span>💬</span>
                    {complaint.comment_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <span>👁️</span>
                    {complaint.view_count}
                  </span>
                </div>

                {complaint.resolved_at && (
                  <div className="text-xs text-green-600">
                    Resolved on {new Date(complaint.resolved_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {sortedComplaints.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-medium mb-2">No complaints found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}