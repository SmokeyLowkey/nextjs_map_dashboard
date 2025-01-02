"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useUser } from "@clerk/nextjs"
import Link from 'next/link'
import { PlusCircle, MessageSquare, Trash2, Check, X } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatHistory = {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface ChatResponse {
  content: Array<{ text: string }>
}

export default function AIChatPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'error' | null>(null)
  const [isAiTyping, setIsAiTyping] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await fetch('/api/chat-history')
        if (!response.ok) throw new Error('Failed to fetch chat history')
        const data = await response.json()
        setChatHistory(data)
      } catch (error) {
        console.error('Failed to fetch chat history:', error)
        toast({
          title: "Error",
          description: "Failed to load chat history",
          variant: "destructive",
        })
      }
    }

    fetchChatHistory()
  }, [toast])

  // Initialize new chat
  useEffect(() => {
    if (!currentChatId && messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: 'Welcome to John Deere Product Support! I\'m here to help you with any questions about John Deere equipment, maintenance, parts, or technical specifications. How can I assist you today? \n\nFor better search result include model number before question like so -> model: 450K' 
        }
      ])
    }
  }, [currentChatId, messages.length])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    try {
      setIsLoading(true)
      setError(null)
      
      const userMessage: Message = { role: 'user', content: input }
      setMessages(prev => [...prev, userMessage])
      setInput('')
      
      // Show AI typing indicator
      setIsAiTyping(true)
      setMessages(prev => [...prev, { role: 'assistant', content: '...' }])

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      const data = await response.json() as ChatResponse
      // Remove typing indicator and add actual response
      setIsAiTyping(false)
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content[0].text
      }

      const newMessages = [...messages, userMessage, assistantMessage].filter(msg => 
        !(msg.role === 'assistant' && msg.content === '...')
      )
      setMessages(newMessages)

      // Auto-save after each message exchange
      if (newMessages.length > 1) {
        saveChat(newMessages)
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createNewChat = async () => {
    if (chatHistory.length >= 10) {
      toast({
        title: "Chat Limit Reached",
        description: "Please delete some existing chats before creating a new one. Maximum limit is 10 chats.",
        variant: "destructive",
      })
      return
    }

    try {
      const welcomeMessage = { 
        role: 'assistant' as const, 
        content: 'Welcome to John Deere Product Support! I\'m here to help you with any questions about John Deere equipment, maintenance, parts, or technical specifications. How can I assist you today? \n\nFor better search result include model number before question like so -> model: 450K' 
      }
      
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [welcomeMessage],
          title: 'New Chat',
        }),
      })

      if (!response.ok) throw new Error('Failed to create new chat')
      
      const newChat = await response.json()
      setCurrentChatId(newChat.id)
      setMessages([welcomeMessage])
      
      // Update chat history
      setChatHistory(prev => [newChat, ...prev])
      
      toast({
        title: "Success",
        description: "New chat created successfully",
      })
    } catch (error) {
      console.error('Failed to create new chat:', error)
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      })
    }
  }

  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat-history/${chatId}`)
      if (!response.ok) throw new Error('Failed to load chat')
      const chat = await response.json()
      setMessages(chat.messages)
      setCurrentChatId(chat.id)
    } catch (error) {
      console.error('Failed to load chat:', error)
      toast({
        title: "Error",
        description: "Failed to load chat",
        variant: "destructive",
      })
    }
  }

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat-history/${chatId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete chat')
      
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
      if (currentChatId === chatId) {
        createNewChat()
      }
      
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      })
    } catch (error) {
      console.error('Failed to delete chat:', error)
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      })
    }
  }

  const saveChat = async (messagesToSave = messages) => {
    if (messagesToSave.length <= 1) return // Don't save if only welcome message exists
    
    try {
      setSaveStatus(null)
      // Use first user message as title, but keep it shorter
      const title = messagesToSave[1]?.content.slice(0, 30) + "..." 
      
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSave,
          title,
          chatId: currentChatId,
        }),
      })

      if (!response.ok) throw new Error('Failed to save chat')
      
      const savedChat = await response.json()
      setCurrentChatId(savedChat.id)
      
      // Update chat history
      setChatHistory(prev => {
        const exists = prev.some(chat => chat.id === savedChat.id)
        if (exists) {
          return prev.map(chat => 
            chat.id === savedChat.id ? savedChat : chat
          )
        }
        return [savedChat, ...prev]
      })

      setSaveStatus('saved')
    } catch (error) {
      console.error('Failed to save chat:', error)
      setSaveStatus('error')
      toast({
        title: "Error",
        description: "Failed to save chat",
        variant: "destructive",
      })
    }
  }

  const isAdmin = user?.publicMetadata?.role === 'admin'

  return (
    <div className="h-full p-4 flex gap-4 relative">
      {/* Chat History Sidebar */}
      <Card className="flex flex-col h-full transition-all duration-300 ease-in-out hover:w-72 w-[60px] group">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <MessageSquare className="w-5 h-5" />
            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Chat History
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <Button
            onClick={() => createNewChat()}
            variant="ghost"
            className="w-full mb-4 group-hover:bg-accent/50 transition-colors"
            disabled={isLoading}
          >
            <PlusCircle className="w-4 h-4" />
            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">New Chat</span>
          </Button>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-2">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex items-center justify-between rounded-lg border p-2 hover:bg-accent cursor-pointer transition-colors ${
                    currentChatId === chat.id ? 'bg-accent' : ''
                  } group/item`}
                  onClick={() => loadChat(chat.id)}
                >
                  <div className="flex items-center w-full gap-1">
                    <div className="flex items-center flex-1 min-w-0">
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate max-w-[160px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{chat.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover/item:opacity-100 flex-shrink-0 ml-1 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChat(chat.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>John Deere Product Support</CardTitle>
              <CardDescription>
                Expert assistance for all John Deere equipment
                {!isAdmin && (
                  <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                    Limited to 5 support requests per day
                  </div>
                )}
              </CardDescription>
            </div>
            {isAdmin && (
              <Link href="/dashboard/ai-chat/upload">
                <Button variant="outline" size="sm">
                  Upload Product Docs
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden h-[calc(100vh-280px)]">
          <ScrollArea className="h-full pr-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 animate-slide-in`}>
                <div className={`flex items-end ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{message.role === 'user' ? 'U' : 'JD'}</AvatarFallback>
                  </Avatar>
                  <div 
                    className={`mx-2 py-3 px-4 rounded-2xl shadow-sm max-w-[80%] transition-all duration-200 ease-in-out ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-[#367C2B] text-white rounded-tl-none'
                    }`}
                  >
                    {message.content === '...' ? (
                      <div className="flex space-x-2 px-2">
                        <div className="w-2.5 h-2.5 bg-white/80 rounded-full animate-pulse"></div>
                        <div className="w-2.5 h-2.5 bg-white/80 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2.5 h-2.5 bg-white/80 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                      </div>
                    ) : (
                      <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {error && (
              <div className="text-red-500 text-center my-2">
                {error}
              </div>
            )}
            <div ref={scrollRef} />
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form 
            onSubmit={(e) => { 
              e.preventDefault()
              handleSend()
            }} 
            className="flex w-full items-center space-x-2"
          >
            <Input 
              placeholder="Ask about any John Deere equipment..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex items-center gap-2">
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="bg-[#367C2B] hover:bg-[#367C2B]/90"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
              <div 
                className="relative group"
                title={saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Not saved' : ''}
              >
                {saveStatus === 'saved' && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                {saveStatus === 'error' && (
                  <X className="h-5 w-5 text-red-500" />
                )}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-sm text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Not saved' : ''}
                </span>
              </div>
            </div>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
