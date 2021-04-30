import * as ctx from '../../api/index.js'

global.wsConnectionInfo = {
  connCounter: 0,
  connections: new Map(),
}

export function setConfig(id, config) {
  for (const [_, state] of wsConnectionInfo.connections) {
    if (state.user && state.user.id === id) {
      state.ws.send(JSON.stringify({ config }))
    }
  }
}

export function setImage(broadcaster_id, guest_id, purpose, image) {
  if (broadcaster_id !== guest_id) {
    purpose += 'Override'
  }

  const avatars = {}
  avatars[guest_id] = {}
  avatars[guest_id][purpose] = image

  for (const [_, state] of wsConnectionInfo.connections) {
    const isBroadcaster = state.user && state.user.id === broadcaster_id
    if (state.avatars.has(guest_id) && (broadcaster_id === guest_id || isBroadcaster)) {
      state.ws.send(JSON.stringify({ avatars }))
    }
  }
}

export default function (wss) {
  wss.on('connection', (ws) => {
    const connID = `${++wsConnectionInfo.connCounter}`

    const localState = {
      connID,
      ws,
      avatars: new Set(),
    }

    // Send ping frame every 15 seconds to keep connection alive
    const i = setInterval(() => {
      ws.send('{}')
    }, 15 * 1000)

    wsConnectionInfo.connections.set(connID, localState)
    ws.on('close', () => {
      clearInterval(i)
      wsConnectionInfo.connections.delete(connID)
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

        const images = await ctx.getImages(localState.user && localState.user.id, d.avatar)

        const avatars = {}
        avatars[d.avatar] = images
        ws.send(JSON.stringify({ avatars }))
      }
    })
  })
}
