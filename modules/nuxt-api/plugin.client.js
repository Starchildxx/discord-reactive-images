import Cookie from 'cookie'
import jwt_decode from "jwt-decode"

function apiSegment(jwt, apiPath) {
  return new Proxy(() => {}, {
    get(_target, prop, _receiver) {
      return apiSegment(jwt, [...apiPath, prop])
    },
    async apply(_target, _thisArg, argumentsList) {
      const r = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify({
          method: apiPath,
          arguments: argumentsList,
          jwt,
        }),
      })

      const d = await r.json()

      if (!r.ok) {
        throw new Error(d.error)
      }
      return d
    },
  })
}

export default function({}, inject) {
  const cookies = Cookie.parse(document.cookie || '')
  const jwt = cookies['user'] || null
  let user = null

  if (jwt) {
    user = { jwt, ...jwt_decode(jwt) }
    if (+(new Date())/1000 >= user.exp) {
      user = null
    }
  }

  inject('<%= options.variable %>', apiSegment(jwt, []))
  inject('user', user)
}
