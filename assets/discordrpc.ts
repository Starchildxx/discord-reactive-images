import { onBeforeUnmount, reactive, Ref, ref, useContext, watch } from '@nuxtjs/composition-api'
import jwt_decode from 'jwt-decode'

export interface Config {
  id?: string
  token?: string
  jwt?: string
  bounce?: boolean
  gapPercentage?: number
  includeSelf?: boolean
}

export interface Member {
  id: string
  avatar: string
  name: string
  speaking: boolean
  images?: Images
  rawImages?: Images
}

export interface Images {
  inactive: string
  speaking: string
  inactiveOverride?: string
  speakingOverride?: string
}

interface ConfigSocketEvent {
  config: Config
  avatars: {
    [id: string]: Images
  }
}

interface JWT {
  exp: number
}

interface AuthorizeResponse {
  code: string
}

interface GetChannelResponse {
  voice_states: VoiceState[]
}

interface VoiceState {
  nick: string
  user: {
    id: string
    avatar: string
  }
}

interface GetSelectedVoiceChannelResponse {
  id: string
}

export function useDiscordRPC() {
  // @ts-ignore
  const { $api } = useContext()

  const config: Ref<Config> = ref({})
  const visibleMembers: Ref<Member[]> = ref([])
  const error = ref('')

  const members = new Map<string, Member>()
  const avatars = new Map<string, Images>()
  const pendingAvatars = new Set<string>()

  let configSocket: WebSocket | null = null
  let socket: WebSocket | null = null
  let channelID: String | null = null
  let connectionTries = 0
  let commandCounter = 0
  let pendingCommands = new Map()


  /*
  onBeforeUnmount(() => {
    if (socket) {
      socket.onclose = null
      socket.close()
      socket = null
    }
  })
  */

  const loadAvatar = (id: string) => {
    if (avatars.has(id)) {
      recalculateMembers()
      return
    }
    if (pendingAvatars.has(id)) return

    pendingAvatars.add(id)
    if (configSocket && configSocket.readyState === 1) {
      configSocket.send(JSON.stringify({ avatar: id }))
    }
  }

  const recalculateMembers = () => {
    visibleMembers.value = Array.from(members.values())
      .filter((m) => avatars.has(m.id))
      .map((m) => {
        const images = avatars.get(m.id)
        const inactive = images && images.inactive ? `https://cdn.discord-reactive-images.fugi.tech/${images.inactive}` : null
        const speaking = images && images.speaking ? `https://cdn.discord-reactive-images.fugi.tech/${images.speaking}` : null
        const inactiveOverride = images && images.inactiveOverride ? `https://cdn.discord-reactive-images.fugi.tech/${images.inactiveOverride}` : null
        const speakingOverride = images && images.speakingOverride ? `https://cdn.discord-reactive-images.fugi.tech/${images.speakingOverride}` : null

        m.images = {
          inactive: inactiveOverride || speakingOverride || inactive || speaking || `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=1024`,
          speaking: speakingOverride || inactiveOverride || speaking || inactive || `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=1024`,
        }
        m.rawImages = images

        return m
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', ignorePunctuation: true }))
  }

  watch(config, (config) => {
    localStorage.setItem('config', JSON.stringify(config))
  })

  watch(
    () => config.value.jwt,
    (jwt, oldJWT) => {
      if (jwt === oldJWT) return

      if (configSocket) {
        configSocket.onclose = null
        configSocket.close()
      }

      const connect = () => {
        configSocket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api`)
        configSocket.onopen = () => {
          if (!configSocket) return
          configSocket.send(JSON.stringify({ jwt }))
          for (const id of avatars.keys()) configSocket.send(JSON.stringify({ avatar: id }))
          for (const id of pendingAvatars) configSocket.send(JSON.stringify({ avatar: id }))
        }
        configSocket.onmessage = (event) => {
          const d: ConfigSocketEvent = JSON.parse(event.data)
          config.value = Object.assign({}, config.value, d.config)
          for (const [id, avatar] of Object.entries(d.avatars || {})) {
            avatars.set(id, Object.assign({}, avatars.get(id), avatar))
            pendingAvatars.delete(id)
            recalculateMembers()
          }
        }
        configSocket.onclose = (err) => {
          console.error('Config WS failed:', err)
          configSocket = null
          setTimeout(connect, 1000)
        }
      }

      connect()
    }
  )

  const s = {
    connect(tries = 0) {
      if (socket) return

      try {
        const port = 6463 + (tries % 10)
        socket = new WebSocket(`ws://127.0.0.1:${port}/?v=1&client_id=794365445557846066`)
      } catch (err) {
        console.error(err)
        s._handleClose({ code: 1006 })
        return
      }

      socket.onclose = s._handleClose
      socket.onmessage = s._handleMessage
    },

    /* async */ request(cmd: string, args?: any, evt?: string) {
      if (!socket) return

      const nonce = `counter:${++commandCounter}`

      const p = new Promise((resolve, reject) => {
        pendingCommands.set(nonce, { resolve, reject })
      })

      socket.send(JSON.stringify({ cmd, args, evt, nonce }))

      return p
    },

    async subscribe(newChannelID: String | null) {
      // Do nothing if we're already on that channel
      if (channelID === newChannelID) return

      // If we were on an old channel then unsubscribe (without blocking)
      if (channelID) {
        s.request('UNSUBSCRIBE', { channel_id: channelID }, 'VOICE_STATE_CREATE')
        s.request('UNSUBSCRIBE', { channel_id: channelID }, 'VOICE_STATE_UPDATE')
        s.request('UNSUBSCRIBE', { channel_id: channelID }, 'VOICE_STATE_DELETE')
        s.request('UNSUBSCRIBE', { channel_id: channelID }, 'SPEAKING_START')
        s.request('UNSUBSCRIBE', { channel_id: channelID }, 'SPEAKING_STOP')
      }

      // Update state
      channelID = newChannelID
      members.clear()
      recalculateMembers()

      if (!newChannelID) return

      // Subscribe to what we need (without blocking)
      s.request('SUBSCRIBE', { channel_id: newChannelID }, 'VOICE_STATE_CREATE')
      s.request('SUBSCRIBE', { channel_id: newChannelID }, 'VOICE_STATE_UPDATE')
      s.request('SUBSCRIBE', { channel_id: newChannelID }, 'VOICE_STATE_DELETE')
      s.request('SUBSCRIBE', { channel_id: newChannelID }, 'SPEAKING_START')
      s.request('SUBSCRIBE', { channel_id: newChannelID }, 'SPEAKING_STOP')

      // Get list of members in channel (blocking)
      const channel = <GetChannelResponse>await s.request('GET_CHANNEL', { channel_id: newChannelID })
      if (newChannelID !== channelID) return

      for (const v of channel.voice_states) {
        members.set(
          v.user.id,
          reactive({
            id: v.user.id,
            avatar: v.user.avatar,
            name: v.nick,
            speaking: false,
          })
        )
        loadAvatar(v.user.id)
      }
    },

    _handleMessage(message: MessageEvent) {
      let payload = null

      try {
        payload = JSON.parse(message.data)
      } catch (e) {
        console.error('Payload not JSON: ', payload)
        return
      }

      let { cmd, evt, nonce, data } = payload

      // console.log('Incoming Payload: ', payload)

      if (cmd === 'DISPATCH') {
        const method = `evt_${evt}`
        if (method in s) {
          // @ts-ignore
          s[method](data)
        }
        return
      }

      if (!pendingCommands.has(nonce)) return
      const { resolve, reject } = pendingCommands.get(nonce)
      pendingCommands.delete(nonce)

      if (evt === 'ERROR') {
        const error = new Error(data.message)
        // @ts-ignore
        error.code = data.code
        reject(error)
      } else {
        resolve(data)
      }
    },

    _handleClose(e: { code: number }) {
      console.error('WS Closed: ', e)
      error.value = 'Disconnected from Discord. Ensure Discord is running and try refreshing.'
      channelID = null

      if (socket) {
        try {
          socket.close()
        } catch (e) {}
        socket = null
      }

      const tries = e.code === 1006 ? ++connectionTries : 0
      const backoff = Math.pow(2, Math.floor(tries / 10))
      setTimeout(() => s.connect(tries), backoff)
    },

    async evt_READY() {
      if (!config.value.token) {
        const d = <AuthorizeResponse>await s.request('AUTHORIZE', {
          client_id: '794365445557846066',
          scopes: ['rpc', 'identify'],
          prompt: 'none',
        })
        console.log('authorize', d)
        config.value = await $api.code(d.code)
      }

      try {
        await s.request('AUTHENTICATE', { access_token: config.value.token })
      } catch (_) {
        config.value = {}
        error.value = 'Failed to authenticate with Discord. Try refreshing.'
        return
      }

      error.value = ''
      await s.request('SUBSCRIBE', {}, 'VOICE_CHANNEL_SELECT')
      const channel = <GetSelectedVoiceChannelResponse>await s.request('GET_SELECTED_VOICE_CHANNEL')
      if (channel) s.subscribe(channel.id)
    },

    async evt_VOICE_CHANNEL_SELECT({ channel_id }: { channel_id: string }) {
      this.subscribe(channel_id)
    },

    async evt_VOICE_STATE_CREATE(v: VoiceState) {
      members.set(
        v.user.id,
        reactive({
          id: v.user.id,
          avatar: v.user.avatar,
          name: v.nick,
          speaking: false,
        })
      )
      loadAvatar(v.user.id)
    },

    async evt_VOICE_STATE_UPDATE(v: VoiceState) {
      const m = members.get(v.user.id)
      if (m) {
        m.avatar = v.user.avatar
        m.name = v.nick
      }
    },

    async evt_VOICE_STATE_DELETE(v: VoiceState) {
      members.delete(v.user.id)
      recalculateMembers()
    },

    async evt_SPEAKING_START({ user_id }: { user_id: string }) {
      const m = members.get(user_id)
      if (m) {
        m.speaking = true
      }
    },

    async evt_SPEAKING_STOP({ user_id }: { user_id: string }) {
      const m = members.get(user_id)
      if (m) {
        m.speaking = false
      }
    },

    evt_ERROR(data: any) {
      console.error('Dispatched Error: ', data)
      if (socket) {
        socket.close()
      }
    },
  }

  try {
    config.value = JSON.parse(localStorage.getItem('config') || '') || {}
  } catch (_) {}

  if (config.value.jwt) {
    const now = 600 + +new Date() / 1000
    const jwt: JWT = jwt_decode(config.value.jwt)
    if (now >= jwt.exp) {
      config.value = {}
    }
  }

  s.connect()

  return {
    config,
    members: visibleMembers,
    error,
  }
}
