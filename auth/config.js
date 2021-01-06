import { Router } from 'express'

export default function(ctx) {
  const app = Router()

  app.get('/', async (req, res) => {
    if (!req.query.jwt) {
      console.error('no JWT set')
      res.status(400).send()
      return
    }

    let id
    try {
      const $user = await ctx.decodeJWT(req.query.jwt)
      id = $user.id
    } catch (e) {
      console.error('jwt decode error', e)
      res.status(400).send()
      return
    }

    ctx.join(ctx.connections, id, res)

    const { results } = await ctx.query(`SELECT * FROM configs WHERE discord_id = ?`, [id])
    const config = results && results.length ? results[0] : {}

    res.set('Content-Type', 'text/event-stream')
    res.set('Cache-Control', 'no-cache')
    res.set('Connection', 'keep-alive')
    res.set('X-Accel-Buffering', 'no')
    res.write(
      `data: ${JSON.stringify({
        includeSelf: !!config.include_self || false,
        bounce: !!config.bounce || false,
        gapPercentage: +config.gap_percentage || 0,
      })}\n\n`
    )
  })

  return app
}
