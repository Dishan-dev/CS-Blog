import type { BlogPost } from '../../lib/database.types'

export const STORY_CHAPTERS = [
  'All',
  'Exchange Experiences',
  'Leadership',
  'Personal Development',
  'Events & Announcements',
  'Member Stories',
  'Global Impact',
] as const

export const CATEGORY_COLORS: Record<string, string> = {
  'Exchange Experiences': '#00a892',
  Leadership: '#037ef3',
  'Personal Development': '#7b2fbe',
  'Events & Announcements': '#f2622e',
  'Member Stories': '#13a24a',
  'Global Impact': '#3d5afe',
}

export const categoryColor = (category: string) => CATEGORY_COLORS[category] ?? '#037ef3'

export const storyDate = (post: Pick<BlogPost, 'published_at' | 'created_at'>) =>
  new Date(post.published_at ?? post.created_at)

export const formatStoryDate = (
  post: Pick<BlogPost, 'published_at' | 'created_at'>,
  month: 'short' | 'long' = 'short',
) => storyDate(post).toLocaleDateString('en-US', { month, day: 'numeric', year: 'numeric' })

/** Newest first. */
export const sortStories = (posts: BlogPost[]) =>
  [...posts].sort((a, b) => storyDate(b).getTime() - storyDate(a).getTime())

export interface StoryMonth {
  key: string
  label: string
  posts: BlogPost[]
}

export function groupStoriesByMonth(posts: BlogPost[]): StoryMonth[] {
  const groups: StoryMonth[] = []
  for (const post of sortStories(posts)) {
    const d = storyDate(post)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = {
        key,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        posts: [],
      }
      groups.push(group)
    }
    group.posts.push(post)
  }
  return groups
}

export const storyUrl = (id: string) =>
  typeof window === 'undefined' ? `/blog/${id}` : `${window.location.origin}/blog/${id}`

/**
 * Opens the native share sheet where available (most phones), otherwise copies the link.
 * Resolves to 'shared' | 'copied' | 'cancelled'.
 */
export async function shareStory(post: Pick<BlogPost, 'id' | 'title' | 'excerpt'>) {
  const url = storyUrl(post.id)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: post.title, text: post.excerpt, url })
      return 'shared' as const
    } catch {
      return 'cancelled' as const
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied' as const
}

/* ─── Reading a post's HTML as a story ─── */

export interface StoryChapter {
  id: string
  title: string
  html: string
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)

/** Splits post HTML into an intro plus chapters, one per <h2>. */
export function parseStory(html: string): { intro: string; chapters: StoryChapter[] } {
  if (typeof DOMParser === 'undefined' || !html.trim()) return { intro: html, chapters: [] }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return { intro: html, chapters: [] }

  let intro = ''
  const chapters: StoryChapter[] = []
  for (const node of Array.from(root.childNodes)) {
    const el = node as Element
    if (el.tagName === 'H2') {
      const title = el.textContent?.trim() || `Chapter ${chapters.length + 1}`
      chapters.push({ id: `ch-${chapters.length + 1}-${slug(title)}`, title, html: '' })
      continue
    }
    const piece = el.outerHTML ?? node.textContent ?? ''
    if (chapters.length) chapters[chapters.length - 1].html += piece
    else intro += piece
  }
  return { intro, chapters }
}

/** Pulls the photos and the first quote out of a post, for the story viewer and cards. */
export function storyHighlights(html: string) {
  if (typeof DOMParser === 'undefined') return { photos: [], quote: null as string | null }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const photos = Array.from(doc.querySelectorAll('img'))
    .map((i) => ({ src: i.getAttribute('src') ?? '', alt: i.getAttribute('alt') ?? '' }))
    .filter((p) => p.src)
  const quote = doc.querySelector('blockquote')?.textContent?.trim() || null
  return { photos, quote }
}
