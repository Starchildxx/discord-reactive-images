import Cookie from 'cookie'
import { API } from './nuxt-api.js'
import { decodeJWT } from '../api'

export default async function(ctx, inject) {
  const cookies = Cookie.parse(ctx.req.headers.cookie || '')
  const jwt = cookies['user'] || null
  let user = null

  if (jwt) {
    try {
      user = await decodeJWT(jwt)
    } catch (_) {}
  }

  // SSR only uses GET endpoints which don't need globalState
  inject('<%= options.variable %>', API({}, user))
  inject('user', user)
}
