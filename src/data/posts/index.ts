import type { Post } from './types'
import { post as semaforoGo } from './semaforo-go'
import { post as datasEmGo } from './datas-em-go'
import { post as queryTimeoutSethint } from './query-timeout-sethint'
import { post as mergeConflict } from './merge-conflict'
import { post as fieldMask } from './field-mask'
import { post as anosComoDev } from './3-anos-como-dev'
import { post as runLocalRefatoracao } from './run-local-refatoracao'
import { post as deferGo } from './defer-go'
import { post as comandosLegais } from './comandos-legais'
import { post as fuzzingGo } from './fuzzing-go'
import { post as pkceJwtJwks } from './pkce-jwt-jwks'

export const posts: Post[] = [
  semaforoGo,
  datasEmGo,
  queryTimeoutSethint,
  mergeConflict,
  fieldMask,
  anosComoDev,
  runLocalRefatoracao,
  deferGo,
  comandosLegais,
  fuzzingGo,
  pkceJwtJwks,
].sort((a, b) => b.date.localeCompare(a.date))

export const getPostBySlug = (slug: string) => posts.find((p) => p.slug === slug)

export const getFeaturedPost = () => posts.find((p) => p.featured) ?? posts[0]

export const getRecentPosts = (limit = 4) => posts.slice(0, limit)
