import type { Post } from './types'
import { post as semaforoGo } from './semaforo-go'
import { post as datasEmGo } from './datas-em-go'
import { post as queryTimeoutSethint } from './query-timeout-sethint'
import { post as mergeConflict } from './merge-conflict'
import { post as fieldMask } from './field-mask'
import { post as anosComoDev } from './3-anos-como-dev'
import { post as runLocalRefatoracao } from './run-local-refatoracao'
import { post as deferGo } from './defer-go'

export const posts: Post[] = [
  semaforoGo,
  datasEmGo,
  queryTimeoutSethint,
  mergeConflict,
  fieldMask,
  anosComoDev,
  runLocalRefatoracao,
  deferGo,
]

export const getPostBySlug = (slug: string) => posts.find((p) => p.slug === slug)

export const getFeaturedPost = () => posts.find((p) => p.featured) ?? posts[0]

const RECENT_SLUGS = [
  'semaforo-go',
  'field-mask',
  'run-local-refatoracao',
  'defer-go',
]

export const getRecentPosts = (_limit = 4) =>
  RECENT_SLUGS.map((s) => posts.find((p) => p.slug === s)).filter(Boolean) as Post[]
