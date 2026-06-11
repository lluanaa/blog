export interface Post {
  slug: string
  title: string
  title_en?: string
  excerpt: string
  excerpt_en?: string
  content: string
  content_en?: string
  date: string
  readTime: number
  tags: string[]
  featured?: boolean
  accent?: string // decorative symbol
  gopher?: string // path to gopher image used as card background
}
