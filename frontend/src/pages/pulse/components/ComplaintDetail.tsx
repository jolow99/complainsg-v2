import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useCurrentUser } from '@/hooks/useAuth'

interface ComplaintDetailData {
  id: string
  original_text: string
  conversation_history: { question: string; answer: string }[]
  title: string
  category: string
  subcategory?: string
  urgency: string
  status: string
  location_description?: string
  planning_area?: string
  postal_code?: string
  frequency?: string
  time_of_occurrence?: string
  affected_count?: number
  sentiment_score?: number
  tags: string[]
  keywords: string[]
  upvote_count: number
  comment_count: number
  view_count: number
  created_at: string
  updated_at: string
  resolved_at?: string
  comments: Comment[]
}

interface Comment {
  id: string
  content: string
  upvote_count: number
  is_from_authority: boolean
  created_at: string
  parent_comment_id?: string
}

interface Props {
  complaintId: string
  onClose: () => void
}

export default function ComplaintDetail({ complaintId, onClose }: Props) {
  const [complaint, setComplaint] = useState<ComplaintDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const { data: user } = useCurrentUser()

  useEffect(() => {
    loadComplaintDetail()
  }, [complaintId])

  const loadComplaintDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pulse/complaints/${complaintId}`)
      if (response.ok) {
        const data = await response.json()
        setComplaint(data)
      } else {
        console.error('Failed to load complaint details')
      }
    } catch (error) {
      console.error('Error loading complaint details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!user) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pulse/complaints/${complaintId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote_type: 'upvote' })
      })

      if (response.ok) {
        const data = await response.json()
        if (complaint) {
          setComplaint({
            ...complaint,
            upvote_count: data.upvote_count
          })
        }
        setHasVoted(!hasVoted)
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return

    try {
      setSubmittingComment(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/pulse/complaints/${complaintId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment })
      })

      if (response.ok) {
        setNewComment('')
        // Reload complaint details to get updated comments
        await loadComplaintDetail()
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSubmittingComment(false)
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

  const getSentimentIcon = (score?: number) => {
    if (!score) return '😐'
    if (score > 0.1) return '😊'
    if (score < -0.1) return '😟'
    return '😐'
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p>Loading complaint details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-medium mb-2">Complaint not found</h3>
            <Button onClick={onClose}>Close</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-3">{complaint.title}</CardTitle>
              <div className="flex items-center gap-2 mb-3">
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
                <div className="text-2xl ml-2">
                  {getSentimentIcon(complaint.sentiment_score)}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>
              ✕
            </Button>
          </div>

          <CardDescription>
            <div className="space-y-1">
              <div>Submitted on {new Date(complaint.created_at).toLocaleString()}</div>
              {complaint.location_description && (
                <div>📍 {complaint.location_description}</div>
              )}
              {complaint.planning_area && (
                <div>🗺️ {complaint.planning_area}</div>
              )}
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Original Complaint */}
          <div>
            <h3 className="font-semibold mb-2">Original Complaint</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{complaint.original_text}</p>
            </div>
          </div>

          {/* Conversation History */}
          {complaint.conversation_history && complaint.conversation_history.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Follow-up Questions & Answers</h3>
              <div className="space-y-3">
                {complaint.conversation_history.map((qa, index) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg">
                    <div className="font-medium text-blue-700 mb-2">Q: {qa.question}</div>
                    <div className="text-blue-600">A: {qa.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Details</h3>
              <div className="space-y-2 text-sm">
                {complaint.frequency && (
                  <div><span className="font-medium">Frequency:</span> {complaint.frequency}</div>
                )}
                {complaint.time_of_occurrence && (
                  <div><span className="font-medium">Time:</span> {complaint.time_of_occurrence}</div>
                )}
                {complaint.affected_count && (
                  <div><span className="font-medium">People Affected:</span> {complaint.affected_count}</div>
                )}
                {complaint.sentiment_score !== undefined && (
                  <div><span className="font-medium">Sentiment Score:</span> {complaint.sentiment_score.toFixed(2)}</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Engagement</h3>
              <div className="space-y-2 text-sm">
                <div>👍 {complaint.upvote_count} upvotes</div>
                <div>💬 {complaint.comment_count} comments</div>
                <div>👁️ {complaint.view_count} views</div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {complaint.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {complaint.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleVote}
              variant={hasVoted ? "default" : "outline"}
              className="flex items-center gap-2"
              disabled={!user}
            >
              👍 {hasVoted ? 'Voted' : 'Upvote'} ({complaint.upvote_count})
            </Button>
            {!user && (
              <p className="text-sm text-gray-600">Sign in to vote and comment</p>
            )}
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center">
              💬 Comments ({complaint.comment_count})
            </h3>

            {/* Add Comment */}
            {user && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-3">
                  <Input
                    placeholder="Add your comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                  >
                    {submittingComment ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {complaint.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    comment.is_from_authority
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {comment.is_from_authority && (
                        <Badge className="bg-blue-100 text-blue-700" variant="secondary">
                          🏛️ Official Response
                        </Badge>
                      )}
                      <span className="text-sm text-gray-600">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      👍 {comment.upvote_count}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}

              {complaint.comments.length === 0 && (
                <div className="text-center py-8 text-gray-600">
                  No comments yet. Be the first to share your thoughts!
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}