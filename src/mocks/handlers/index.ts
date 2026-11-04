import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { controlHandlers } from './control'
import { favoritesHandlers } from './favorites'

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...catalogHandlers,
]
