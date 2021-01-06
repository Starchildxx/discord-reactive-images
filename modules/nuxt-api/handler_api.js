import bodyParser from 'body-parser'
import { API } from '../../.nuxt/nuxt-api.js'
import { decodeJWT } from '../../api'

const parser = bodyParser.json({
  limit: '50mb',
})

export default (globalState) => {
  return async (req, resp, _next) => {
    const err = await new Promise((resolve) => parser(req, resp, resolve))
    if (err) {
      console.error(err)
      resp.writeHead(500)
      resp.end(JSON.stringify({ error: err.message }))
      return
    }

    if (!req.body.method || !req.body.method.length) {
      resp.writeHead(400)
      resp.end(JSON.stringify({ error: 'Invalid request' }))
      return
    }

    let $user = null
    if (req.body.jwt) {
      try {
        $user = await decodeJWT(req.body.jwt)
      } catch (_) {}
    }

    const api = API(globalState, $user)

    const key = req.body.method.join('.')
    if (!(key in api)) {
      resp.writeHead(404)
      resp.end()
      return
    }

    try {
      const result = await api[key](...req.body.arguments)
      resp.end(JSON.stringify(result))
    } catch (err) {
      console.error(err)
      resp.writeHead(500)
      resp.end(JSON.stringify({ error: err.message }))
    }
  }
}
