export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  createdAt?: Date
}

export interface Source {
  title: string
  url?: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages?: Message[]
}
