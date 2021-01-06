import * as ctx from '../../api/index.js'

export default function (wss, globalState) {
  const connections = new Map()
  let connCounter = 0

  globalState.setConfig = (id, config) => {
    for (const [_, state] of connections) {
      if (state.user && state.user.id === id) {
        state.ws.send(JSON.stringify({ config }))
      }
    }
  }

  globalState.setImage = (id, image) => {
    const avatars = {}
    avatars[id] = image

    for (const [_, state] of connections) {
      if (state.avatars.has(id)) {
        state.ws.send(JSON.stringify({ avatars }))
      }
    }
  }

  wss.on('connection', (ws) => {
    const connID = `${++connCounter}`

    const localState = {
      connID,
      ws,
      avatars: new Set(),
    }

    connections.set(connID, localState)
    ws.on('close', () => {
      connections.delete(connID)
    })

    ws.on('message', async (msg) => {
      const d = JSON.parse(msg)

      if (d.jwt) {
        try {
          localState.user = await ctx.decodeJWT(d.jwt)
        } catch (_) {
          return
        }

        const { results } = await ctx.query(`SELECT * FROM configs WHERE discord_id = ?`, [localState.user.id])
        const config = results && results.length ? results[0] : {}

        ws.send(
          JSON.stringify({
            config: {
              includeSelf: !!config.include_self || false,
              bounce: !!config.bounce || false,
              gapPercentage: +config.gap_percentage || 0,
            },
          })
        )
      }

      if (d.avatar) {
        localState.avatars.add(d.avatar)

        const { results } = await ctx.query(`SELECT filename FROM images WHERE discord_id = ?`, [d.avatar])
        const image = results && results.length ? results[0].filename : null

        const avatars = {}
        avatars[d.avatar] = image
        ws.send(JSON.stringify({ avatars }))
      }
    })
  })
}
