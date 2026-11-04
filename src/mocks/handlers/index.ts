import { authHandlers } from './auth'
import { catalogHandlers } from './catalog'
import { controlHandlers } from './control'
import { favoritesHandlers } from './favorites'

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...favoritesHandlers,
  ...catalogHandlers,
]
