import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, Loader2, Video, FolderOpen } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Video {
  id: number
  title: string
  url: string
  module: string
  chapter: string
  lesson_id: string
}

interface VideoProgress {
  title: string
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  size: number
  downloaded: number
  error?: string
}

interface DownloadProgress {
  status: 'downloading' | 'completed' | 'cancelled' | ''
  total: number
  completed: number
  failed: number
  current_video: number | null
  current_progress: number
  videos: Record<number, VideoProgress>
}

interface VideosResponse {
  total_videos: number
  total_lessons: number
  extracted_at: string
  organized: Record<string, Record<string, Video[]>>
  videos: Video[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function App() {
  const [videos, setVideos] = useState<VideosResponse | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVideos = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/videos`)
      if (!response.ok) throw new Error('Failed to fetch videos')
      const data = await response.json()
      setVideos(data)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos')
      setIsLoading(false)
    }
  }, [])

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/download/status`)
      if (!response.ok) return
      const data = await response.json()
      setIsDownloading(data.is_downloading)
      if (data.progress && Object.keys(data.progress).length > 0) {
        setProgress(data.progress)
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
    fetchProgress()
  }, [fetchVideos, fetchProgress])

  useEffect(() => {
    if (!isDownloading) return
    const interval = setInterval(fetchProgress, 500)
    return () => clearInterval(interval)
  }, [isDownloading, fetchProgress])

  const startDownload = async (videoIds?: number[]) => {
    try {
      const response = await fetch(`${API_URL}/api/download/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: videoIds || null })
      })
      const data = await response.json()
      if (data.status === 'started') {
        setIsDownloading(true)
        fetchProgress()
      } else {
        setError(data.message || 'Failed to start download')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start download')
    }
  }

  const cancelDownload = async () => {
    try {
      await fetch(`${API_URL}/api/download/cancel`, { method: 'POST' })
      fetchProgress()
    } catch (err) {
      console.error('Failed to cancel:', err)
    }
  }

  const resetDownload = async () => {
    try {
      await fetch(`${API_URL}/api/download/reset`, { method: 'POST' })
      setProgress(null)
      setIsDownloading(false)
    } catch (err) {
      console.error('Failed to reset:', err)
    }
  }

  const toggleVideoSelection = (id: number) => {
    const newSelected = new Set(selectedVideos)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedVideos(newSelected)
  }

  const selectAllInChapter = (chapterVideos: Video[]) => {
    const newSelected = new Set(selectedVideos)
    const allSelected = chapterVideos.every(v => selectedVideos.has(v.id))
    chapterVideos.forEach(v => {
      if (allSelected) {
        newSelected.delete(v.id)
      } else {
        newSelected.add(v.id)
      }
    })
    setSelectedVideos(newSelected)
  }

  const selectAll = () => {
    if (!videos) return
    if (selectedVideos.size === videos.videos.length) {
      setSelectedVideos(new Set())
    } else {
      setSelectedVideos(new Set(videos.videos.map(v => v.id)))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'downloading': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'failed': return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'downloading': return <Badge className="bg-blue-100 text-blue-800">Downloading</Badge>
      default: return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
    }
  }

  const overallProgress = progress ? Math.round((progress.completed / progress.total) * 100) : 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading videos...</p>
        </div>
      </div>
    )
  }

  if (error && !videos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchVideos}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Video className="h-10 w-10 text-blue-500" />
            AI & Quantum Video Downloader
          </h1>
          <p className="text-slate-400">
            Download all course videos with progress tracking
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">Total Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-500">{videos?.total_videos || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-purple-500">{selectedVideos.size}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">Downloaded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-500">{progress?.completed || 0}</p>
            </CardContent>
          </Card>
        </div>

        {progress && progress.status && (
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Download Progress</span>
                {getStatusBadge(progress.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Overall Progress</span>
                    <span>{progress.completed} / {progress.total} videos ({overallProgress}%)</span>
                  </div>
                  <Progress value={overallProgress} className="h-3 bg-slate-700" />
                </div>

                {progress.current_video !== null && progress.videos[progress.current_video] && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      <span className="text-white font-medium truncate">
                        {progress.videos[progress.current_video].title}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                      <span>
                        {formatBytes(progress.videos[progress.current_video].downloaded)} / {formatBytes(progress.videos[progress.current_video].size)}
                      </span>
                      <span>{progress.videos[progress.current_video].progress}%</span>
                    </div>
                    <Progress value={progress.videos[progress.current_video].progress} className="h-2 bg-slate-600" />
                  </div>
                )}

                {progress.failed > 0 && (
                  <p className="text-red-400 text-sm">
                    {progress.failed} video(s) failed to download
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={selectAll}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {selectedVideos.size === videos?.videos.length ? 'Deselect All' : 'Select All'}
              </Button>

              {!isDownloading ? (
                <>
                  <Button
                    onClick={() => startDownload()}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All ({videos?.total_videos})
                  </Button>

                  {selectedVideos.size > 0 && (
                    <Button
                      onClick={() => startDownload(Array.from(selectedVideos))}
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={isDownloading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected ({selectedVideos.size})
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={cancelDownload}
                  variant="destructive"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Cancel Download
                </Button>
              )}

              {progress && !isDownloading && (
                <Button
                  onClick={resetDownload}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Videos by Module
            </CardTitle>
            <CardDescription className="text-slate-400">
              Browse and select videos organized by module and chapter
            </CardDescription>
          </CardHeader>
          <CardContent>
            {videos?.organized && (
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(videos.organized).map(([moduleName, chapters]) => (
                  <AccordionItem key={moduleName} value={moduleName} className="border-slate-700 bg-slate-700/30 rounded-lg px-4">
                    <AccordionTrigger className="text-white hover:no-underline">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-yellow-500" />
                        <span className="font-medium">{moduleName}</span>
                        <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                          {Object.values(chapters).flat().length} videos
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Accordion type="multiple" className="ml-4 space-y-2">
                        {Object.entries(chapters).map(([chapterName, chapterVideos]) => (
                          <AccordionItem key={chapterName} value={chapterName} className="border-slate-600 bg-slate-600/30 rounded-lg px-4">
                            <AccordionTrigger className="text-slate-200 hover:no-underline">
                              <div className="flex items-center gap-3">
                                <Play className="h-4 w-4 text-blue-400" />
                                <span>{chapterName}</span>
                                <Badge variant="secondary" className="bg-slate-500 text-slate-200">
                                  {chapterVideos.length}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ml-2 h-6 text-xs text-slate-400 hover:text-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    selectAllInChapter(chapterVideos)
                                  }}
                                >
                                  {chapterVideos.every(v => selectedVideos.has(v.id)) ? 'Deselect' : 'Select'} All
                                </Button>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 ml-4">
                                {chapterVideos.map((video) => {
                                  const videoProgress = progress?.videos[video.id]
                                  return (
                                    <div
                                      key={video.id}
                                      className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors"
                                    >
                                      <Checkbox
                                        checked={selectedVideos.has(video.id)}
                                        onCheckedChange={() => toggleVideoSelection(video.id)}
                                        className="border-slate-500"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-slate-200 text-sm truncate">{video.title}</p>
                                        {videoProgress && (
                                          <div className="mt-1">
                                            <div className="flex items-center gap-2">
                                              {getStatusIcon(videoProgress.status)}
                                              <Progress value={videoProgress.progress} className="h-1 flex-1 bg-slate-600" />
                                              <span className="text-xs text-slate-400">{videoProgress.progress}%</span>
                                            </div>
                                            {videoProgress.error && (
                                              <p className="text-xs text-red-400 mt-1">{videoProgress.error}</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {videoProgress && getStatusBadge(videoProgress.status)}
                                    </div>
                                  )
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Videos will be downloaded to: /home/ubuntu/video-downloader/downloads</p>
          <p className="mt-1">Extracted at: {videos?.extracted_at}</p>
        </div>
      </div>
    </div>
  )
}

export default App
