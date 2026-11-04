import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { controlHandlers } from './control'
import { favoritesHandlers } from './favorites'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { realtimeHandlers } from '../realtime'

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...catalogHandlers,
  ...realtimeHandlers,
]
