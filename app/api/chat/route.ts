import { Index } from "@upstash/vector"
import Anthropic from '@anthropic-ai/sdk'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
// Initialize vector index with explicit logging
const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
})

// Log the URL being used to help debug
console.log('Using Vector DB URL:', process.env.UPSTASH_VECTOR_REST_URL);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const MAX_MESSAGES_PER_DAY = 5

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { messages } = await req.json()
    const latestMessage = messages[messages.length - 1].content
    
    // Check if user is admin
    const isAdmin = (user?.publicMetadata as { role?: string })?.role === 'admin'

    if (!isAdmin) {
      // Get today's message count from vector store metadata
      const today = new Date().toISOString().split('T')[0]
      const userKey = `user:${userId}:${today}`
      
      try {
        const result = await vectorIndex.query({
          data: userKey,
          topK: 1,
          includeMetadata: true,
        })
        
        let messageCount = 1
        if (result.length > 0) {
          const metadata = result[0].metadata as { messageCount?: number }
          messageCount = (metadata?.messageCount || 0) + 1
        }
        
        // Update message count
        await vectorIndex.upsert({
          id: userKey,
          data: userKey,
          metadata: { 
            messageCount,
            timestamp: Date.now()
          },
        })
        
        if (messageCount > MAX_MESSAGES_PER_DAY) {
          return NextResponse.json({
            error: 'Message limit reached for today. Contact an admin for unlimited messages.',
          }, { status: 429 })
        }
      } catch (error) {
        console.error('Error managing message count:', error)
      }
    }

    try {
      // Generate embedding using HuggingFace API with enhanced retry logic
      console.log('Generating embedding for message:', latestMessage)
      
      const getEmbedding = async (retries = 5, initialDelay = 3000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await fetch(
              "https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5",
              {
                headers: { 
                  Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
                  "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({
                  inputs: latestMessage,
                }),
              }
            );
            
            const result = await response.json();
            
            if (result.error && result.error.includes('loading')) {
              const delay = initialDelay * Math.pow(1.5, i); // Exponential backoff
              console.log(`Model loading, attempt ${i + 1}/${retries}. Waiting ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            // Handle both array formats: direct array or nested array
            let embedding;
            if (Array.isArray(result)) {
              if (Array.isArray(result[0])) {
                // Nested array format
                embedding = result[0];
              } else {
                // Direct array format
                embedding = result;
              }
            } else {
              console.error('Invalid embedding response:', result);
              if (i === retries - 1) {
                console.log('Falling back to keyword search...');
                return null;
              }
              const delay = initialDelay * Math.pow(1.5, i);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            // Validate embedding array
            if (!embedding.every(val => typeof val === 'number')) {
              console.error('Invalid embedding values:', embedding);
              if (i === retries - 1) {
                console.log('Falling back to keyword search...');
                return null;
              }
              const delay = initialDelay * Math.pow(1.5, i);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            return embedding;
          } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) {
              console.log('Falling back to keyword search...');
              return null;
            }
            const delay = initialDelay * Math.pow(1.5, i);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        return null; // Fall back to keyword search if all retries fail
      };

      const embedding = await getEmbedding();
      
      // If embedding generation failed, fall back to keyword search
      let searchResults;
      if (embedding === null) {
        console.log('Using keyword search fallback');
        searchResults = await vectorIndex.query({
          data: latestMessage,
          topK: 5,
          includeMetadata: true,
        });
      } else {
        // Ensure embedding length is exactly 384
        if (embedding.length !== 384) {
          console.error(`Invalid embedding length: ${embedding.length}, expected 384`);
          console.log('Falling back to keyword search');
          searchResults = await vectorIndex.query({
            data: latestMessage,
            topK: 5,
            includeMetadata: true,
          });
        } else {
          // Extract model from user message if specified
          const modelMatch = latestMessage.match(/model:\s*([^\s,]+)/i);
          const requestedModel = modelMatch ? modelMatch[1].toUpperCase() : null;

          // Normal vector search if we have valid embeddings
          const sum = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0))
          const normalizedEmbedding = sum === 0 ? 
            embedding : 
            embedding.map(val => val / sum)

          // Add debug logging for the search
          console.log('Searching with normalized embedding of length:', normalizedEmbedding.length);
          console.log('Requested model filter:', requestedModel);
          
          // Perform vector search with metadata filtering if model is specified
          searchResults = await vectorIndex.query({
            vector: normalizedEmbedding,
            topK: 50, // Increased to ensure we get enough results after filtering
            includeMetadata: true,
            includeVectors: false,
            filter: requestedModel ? `model = "${requestedModel}"` : undefined
          });
          
          // Apply similarity score filtering
          if (searchResults.length > 0 && searchResults[0].score !== undefined) {
            searchResults = searchResults
              .filter(result => result.score >= 0.5)
              .slice(0, 20); // Limit to top 20 most relevant results
          }

          console.log('Filtered results count:', searchResults.length);
          
          console.log('Search results count:', searchResults.length);
          console.log('First result score:', searchResults[0]?.score);
        }
      }
      

      // Format context for Claude with more structure and debug info
      const context = searchResults
        .map(result => {
          const metadata = result.metadata as { 
            model?: string,
            original_data?: {
              Breadcrumb?: string,
              Description?: string,
              "Part Number"?: string,
              Quantity?: string,
              Remarks?: string
            },
            description?: string
          };
          const score = result.score ? ` (similarity: ${result.score.toFixed(2)})` : '';
          
          if (!metadata) return `Source: Unknown${score}\nNo content available`;
          
          const content = [
            `Model: ${metadata.model || 'Unknown'}`,
            `Description: ${metadata.original_data?.Description || 'Not specified'}`,
            `Part Number: ${metadata.original_data?.["Part Number"] || 'Not specified'}`,
            `Quantity: ${metadata.original_data?.Quantity || 'Not specified'}`,
            `Remarks: ${metadata.original_data?.Remarks || 'None'}`,
            `Details: ${metadata.original_data?.Breadcrumb || 'Not available'}`
          ].join('\n');
          
          return `Source: ${metadata.model || 'Unknown'}${score}\n${content}`;
        })
        .join('\n\n---\n\n')

      console.log('Retrieved context:', context) // Log context for debugging

      // Create chat completion with system parameter
      const anthropicResponse = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        system: `You are an expert John Deere product support representative with comprehensive knowledge of all John Deere equipment, from tractors and harvesters to lawn mowers and utility vehicles. 

To get information about a specific model, users can include "model:" followed by the model number in their question (e.g., "model: 5075E what is the oil capacity?"). This will ensure responses are specific to that model.

You specialize in:

1. Technical specifications and features of all John Deere products
2. Troubleshooting common issues and maintenance procedures
3. Parts identification and replacement guidance with exact catalog locations
4. Operating instructions and best practices
5. Warranty information and service schedules

When discussing parts or components, you MUST include their exact location in the catalog using the breadcrumb navigation path provided in the Details field. Always format part locations as "Location in catalog: [breadcrumb path]" to help users find the exact part they need.

IMPORTANT: Base your responses PRIMARILY on the following knowledge base context. If the context doesn't contain relevant information for the query, acknowledge that you don't have specific information about that topic in your knowledge base:

${context}

Maintain a professional, helpful tone and provide detailed, accurate information based on the context provided. If the context doesn't contain specific information about a topic, clearly state that and suggest consulting official John Deere documentation or a certified dealer.`,
        messages: messages.map((msg: Message) => ({
          role: msg.role,
          content: msg.content
        })),
      })

      // Extract the response text
      const responseText = anthropicResponse.content[0].type === 'text' 
        ? anthropicResponse.content[0].text 
        : 'I apologize, but I can only provide text responses at this time.'

      return NextResponse.json({
        content: [{
          text: responseText
        }]
      })
    } catch (error) {
      console.error('Embedding or search error:', error)
      throw error
    }
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
