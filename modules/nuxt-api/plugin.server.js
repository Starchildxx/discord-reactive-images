import Cookie from 'cookie'
import { API } from './nuxt-api.js'
import { decodeJWT } from '../api'
import { globalState } from '../modules/nuxt-api/handler.js'

export default async function(ctx, inject) {
  const cookies = Cookie.parse(ctx.req.headers.cookie || '')
  const jwt = cookies['user'] || null
  let user = null

  if (jwt) {
    try {
      user = await decodeJWT(jwt)
    } catch (_) {}
  }

  inject('<%= options.variable %>', API(globalState, user))
  inject('user', user)
}
