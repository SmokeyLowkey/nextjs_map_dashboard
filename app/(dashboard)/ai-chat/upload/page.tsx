"use client"

import { useState } from 'react'
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const { user } = useUser()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    current: number,
    total: number,
    currentFile: number,
    totalFiles: number,
    fileName: string
  } | null>(null)

  const isAdmin = user?.publicMetadata?.role === 'admin'

  if (!isAdmin) {
    return (
      <div className="h-full p-4">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>
              Only John Deere support administrators can access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/ai-chat')}
            >
              Back to Support Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      setIsUploading(true)
      setError(null)
      setSuccess(null)
      setProgress(null)

      let successCount = 0
      const totalFiles = files.length

      // Process files sequentially to respect rate limits
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)

        try {
          const response = await fetch('/api/documents', {
            method: 'POST',
            body: formData,
          })

          const data = await response.json()

          if (!response.ok || data.error) {
            console.error(`Failed to upload ${file.name}:`, data.error)
            continue
          }

          if (data.progress) {
            setProgress({
              current: data.progress.successfulChunks,
              total: data.progress.totalChunks,
              currentFile: i + 1,
              totalFiles,
              fileName: file.name
            })
          }

          successCount++
          
          // Add delay between files to respect rate limits
          if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000))
          }
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err)
          continue
        }
      }

      setSuccess(`Successfully processed ${successCount} out of ${totalFiles} files`)
      e.target.value = '' // Reset file input
    } catch (err: any) {
      setError(err.message)
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="h-full p-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload John Deere Documentation</CardTitle>
          <CardDescription>
            Upload product manuals, technical specifications, maintenance guides, and other John Deere documentation to enhance the support system&apos;s knowledge base.
            <div className="mt-2 text-sm">
              Supported formats:
              <ul className="list-disc list-inside mt-1">
                <li>Excel files (.xlsx, .xls) - For parts lists, specifications tables</li>
                <li>CSV files (.csv) - For structured data like maintenance schedules</li>
                <li>Word documents (.docx) - For product manuals and guides</li>
                <li>Text files (.txt) - For general documentation</li>
              </ul>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.docx,.txt"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[#367C2B] file:text-white
                  hover:file:bg-[#367C2B]/90
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {isUploading && (
              <div className="space-y-4">
                <div className="text-blue-500 text-sm">
                  Uploading and processing documents...
                </div>
                {progress && (
                  <div className="space-y-4">
                    {/* Overall file progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Overall Progress</span>
                        <span>{progress.currentFile} of {progress.totalFiles} files</span>
                      </div>
                      <Progress 
                        value={(progress.currentFile / progress.totalFiles) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    {/* Current file chunk progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Processing: {progress.fileName}</span>
                        <span>{progress.current} of {progress.total} chunks</span>
                      </div>
                      <Progress 
                        value={(progress.current / progress.total) * 100}
                        className="h-2"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Processing chunks with rate limiting to stay under 2000 RPM
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="text-green-500 text-sm">
                {success}
              </div>
            )}
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/ai-chat')}
              >
                Back to Support Chat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
