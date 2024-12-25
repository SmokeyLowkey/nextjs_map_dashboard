import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { Index } from "@upstash/vector"
import * as XLSX from 'xlsx'
import { parse as csvParse } from 'csv-parse/sync'
import mammoth from 'mammoth'
import { VoyageAIClient } from "voyageai"

const encoder = new TextEncoder()

const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
})

const voyageClient = new VoyageAIClient({ 
  apiKey: process.env.VOYAGEAI_API_KEY! 
})

interface CsvRecord {
  [key: string]: string
}

interface VoyageEmbedding {
  object: 'embedding';
  embedding: number[];
  index: number;
}

interface VoyageResponse {
  object: 'list';
  data: VoyageEmbedding[];
  model: string;
  usage: {
    totalTokens: number;
  };
}

// Helper function to wait with exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to retry failed requests with rate limit awareness
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5, // Increased max retries
  baseDelay: number = 2000 // Reduced base delay to 2 seconds
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      if (error?.statusCode === 429) {
        // For rate limit errors, use a more aggressive backoff
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000
        console.log(`Rate limited. Waiting ${delay/1000} seconds before retry ${i + 1}/${maxRetries}`)
        await wait(delay)
        continue
      } else if (error?.statusCode >= 500) {
        // For server errors, use a shorter delay
        const delay = 1000 * Math.pow(1.5, i)
        console.log(`Server error. Waiting ${delay/1000} seconds before retry ${i + 1}/${maxRetries}`)
        await wait(delay)
        continue
      }
      throw error
    }
  }
  
  throw lastError
}

import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check if user is admin
    const isAdmin = (user?.publicMetadata as { role?: string })?.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can upload documents' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Processing file:', file.name, 'Size:', file.size, 'bytes')

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()
    let content = ''
    let totalRows = 0

    // Parse different file types
    try {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const workbook = XLSX.read(fileBuffer)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const csvContent = XLSX.utils.sheet_to_csv(worksheet)
        const records = csvParse(csvContent, { columns: true }) as CsvRecord[]
        totalRows = records.length
        // Batch rows together (approximately 100 rows per chunk)
        const batchSize = 100
        const batches = []
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)
          batches.push(batch.map(record => Object.values(record).join(' ')).join(' '))
        }
        content = batches.join('\n')
      } 
      else if (fileName.endsWith('.csv')) {
        content = fileBuffer.toString('utf-8')
        const records = csvParse(content, { columns: true }) as CsvRecord[]
        totalRows = records.length
        // Use same batching logic for CSV files
        const batchSize = 100
        const batches = []
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)
          batches.push(batch.map(record => Object.values(record).join(' ')).join(' '))
        }
        content = batches.join('\n')
      }
      else if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer })
        content = result.value
      }
      else if (fileName.endsWith('.txt')) {
        content = fileBuffer.toString('utf-8')
      }
      else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
      }
    } catch (error) {
      console.error('Error parsing file:', error)
      return NextResponse.json({ error: 'Failed to parse file content' }, { status: 500 })
    }

    console.log('Content extracted, length:', content.length, 'characters')

    // For Excel/CSV files, content is already properly chunked by batches
    // For other files, split into chunks of appropriate size
    const chunks = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')
      ? content.split('\n')
      : content.match(/.{1,32000}/g) || []
    console.log('Split into', chunks.length, 'chunks')

    // Create a TransformStream for progress updates
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Process chunks sequentially with retries and longer delays
    const results = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      try {
        console.log(`Processing chunk ${i + 1}/${chunks.length}, length: ${chunk.length}`)

        // Generate embedding for chunk using Voyage AI with retry logic
        const embeddingResponse = await retryWithBackoff(async () => {
          return await voyageClient.embed({
            input: chunk,
            model: "voyage-2"
          })
        })

        // Extract embedding from VoyageAI response
        const voyageResponse = embeddingResponse as VoyageResponse
        
        if (!voyageResponse?.data?.[0]?.embedding || !Array.isArray(voyageResponse.data[0].embedding)) {
          console.error('Invalid embedding response for chunk', i, ':', voyageResponse)
          throw new Error('Failed to generate valid embedding')
        }

        const embedding = voyageResponse.data[0].embedding

        // Filter out any null values and ensure all values are numbers
        const validEmbedding = embedding.filter((val: unknown) => val !== null && !isNaN(Number(val)))

        if (validEmbedding.length === 0) {
          console.error('No valid embedding values found for chunk', i)
          throw new Error('Failed to generate valid embedding')
        }

        // Convert to numbers and normalize if needed
        const numericEmbedding = validEmbedding.map(Number)
        
        // Normalize the embedding to ensure valid float values
        const sum = Math.sqrt(numericEmbedding.reduce((acc: number, val: number) => acc + val * val, 0))
        const normalizedEmbedding = sum === 0 ? 
          numericEmbedding : 
          numericEmbedding.map((val: number) => val / sum)

        // Store chunk with its embedding in Upstash Vector
        await vectorIndex.upsert({
          id: `${fileName}-${i}`,
          vector: normalizedEmbedding,
          metadata: {
            fileName,
            chunkIndex: i,
            content: chunk,
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            // Add batch metadata for spreadsheet files
            ...(fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv') ? {
              batchStart: i * 100 + 1, // Starting row number in this batch
              batchEnd: Math.min((i + 1) * 100, totalRows), // Ending row number
              totalRows: totalRows,
              fileType: 'spreadsheet'
            } : {
              fileType: fileName.split('.').pop() || 'unknown'
            })
          }
        })

        results.push(i)
        console.log(`Successfully processed chunk ${i + 1}/${chunks.length}`)
        

        // Add a delay between chunks to respect the 3 RPM limit (20 seconds between requests)
        if (i < chunks.length - 1) {
          console.log('Waiting 20 seconds before processing next chunk (3 RPM limit)...')
          await wait(20000)
        }
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error)
        // Continue with next chunk instead of failing completely
        continue
      }
    }

    const successCount = results.length
    console.log(`Completed processing ${successCount}/${chunks.length} chunks`)

    if (successCount === 0) {
      return NextResponse.json({ 
        error: 'Failed to process any chunks of the document',
        details: 'Check server logs for more information',
        progress: {
          totalChunks: chunks.length,
          successfulChunks: 0
        }
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Document "${fileName}" processed: ${successCount}/${chunks.length} chunks successfully embedded`,
      progress: {
        totalChunks: chunks.length,
        successfulChunks: successCount
      }
    })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
