<template>
  <div>
    <client-only>
      <template v-if="config.token">
        <div class="grid" :class="{ bounce: config.bounce }" :style="gridStyle">
          <div
            v-for="m in visibleMembers"
            :key="m.id"
            class="member"
            :class="{ speaking: m.speaking }"
            :style="{ backgroundImage: `url(${m.image})`, ...memberStyle }"
          ></div>
        </div>
      </template>
    </client-only>
  </div>
</template>

<script>
export default {
  layout: 'empty',
  data() {
    return {
      members: new Map(),
      avatars: new Map(),
      pendingAvatars: new Set(),

      // Hack around lack of reactivity for Map & Set
      memberStateCounter: 1,
      avatarStateCounter: 1,

      // Config updating
      configSocket: null,

      // RPC stuff
      socket: null,
      channelID: null,
      connectionTries: 0,
      commandCounter: 0,
      pendingCommands: {},

      config: {},
    }
  },
  computed: {
    gridStyle() {
      return {
        'grid-template-columns': `repeat(${this.visibleMembers.length}, 1fr)`,
      }
    },
    memberStyle() {
      return {
        margin: `0 ${this.config.gapPercentage}%`,
      }
    },
    visibleMembers() {
      return (
        this.memberStateCounter &&
        this.avatarStateCounter &&
        Array.from(this.members.values())
          .filter((m) => (this.config.includeSelf || m.id !== this.config.id) && this.avatars.has(m.id))
          .map((m) => ({
            ...m,
            image: this.avatars.get(m.id)
              ? `https://cdn.discord-reactive-images.fugi.tech/${this.avatars.get(m.id)}`
              : `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=1024`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', ignorePunctuation: true }))
      )
    },
    debug() {
      return JSON.stringify(this.visibleMembers, null, 2)
      return this.memberStateCounter && JSON.stringify(Object.fromEntries(this.members.entries()), null, 2)
    },
  },
  watch: {
    memberStateCounter() {
      this.members.forEach(async (m) => {
        if (this.avatars.has(m.id) || this.pendingAvatars.has(m.id)) return
        this.pendingAvatars.add(m.id)
        try {
          this.avatars.set(m.id, await this.$api.get_image(m.id))
          this.avatarStateCounter++
        } catch (e) {
          console.error(e)
        }
        this.pendingAvatars.delete(m.id)
      })
    },
    config(config) {
      localStorage.setItem('config', JSON.stringify(config))
    },
    'config.jwt'(jwt, oldJWT) {
      console.log(arguments)
      if (jwt === oldJWT) return

      if (this.configSocket) {
        this.configSocket.onerror = null
        this.configSocket.close()
      }

      const connect = () => {
        this.configSocket = new EventSource(`/auth/config?jwt=${jwt}`)
        this.configSocket.onmessage = (event) => {
          const d = JSON.parse(event.data)
          this.config = Object.assign({}, this.config, d)
        }
        this.configSocket.onerror = (err) => {
          console.error('EventSource failed:', err)
          // connect()
        }
      }

      connect()
    },
  },
  mounted() {
    try {
      this.config = JSON.parse(localStorage.getItem('config')) || {}
    } catch (_) {}

    this.connect()
  },
  beforeDestroy() {
    if (this.socket) {
      this.socket.onclose = null
      this.socket.close()
      this.socket = null
    }
  },
  methods: {
    async subscribe(channelID) {
      // Do nothing if we're already on that channel
      if (channelID === this.channelID) return

      // If we were on an old channel then unsubscribe (without blocking)
      if (this.channelID) {
        this.request('UNSUBSCRIBE', { channel_id: this.channelID }, 'VOICE_STATE_CREATE')
        this.request('UNSUBSCRIBE', { channel_id: this.channelID }, 'VOICE_STATE_UPDATE')
        this.request('UNSUBSCRIBE', { channel_id: this.channelID }, 'VOICE_STATE_DELETE')
        this.request('UNSUBSCRIBE', { channel_id: this.channelID }, 'SPEAKING_START')
        this.request('UNSUBSCRIBE', { channel_id: this.channelID }, 'SPEAKING_STOP')
      }

      // Update state
      this.channelID = channelID
      this.members.clear()
      this.memberStateCounter++

      if (!channelID) return

      // Subscribe to what we need (without blocking)
      this.request('SUBSCRIBE', { channel_id: channelID }, 'VOICE_STATE_CREATE')
      this.request('SUBSCRIBE', { channel_id: channelID }, 'VOICE_STATE_UPDATE')
      this.request('SUBSCRIBE', { channel_id: channelID }, 'VOICE_STATE_DELETE')
      this.request('SUBSCRIBE', { channel_id: channelID }, 'SPEAKING_START')
      this.request('SUBSCRIBE', { channel_id: channelID }, 'SPEAKING_STOP')

      // Get list of members in channel (blocking)
      const channel = await this.request('GET_CHANNEL', { channel_id: channelID })
      if (channelID !== this.channelID) return

      for (const v of channel.voice_states) {
        this.members.set(v.user.id, {
          id: v.user.id,
          avatar: v.user.avatar,
          name: v.nick,
          speaking: false,
        })
      }
      this.memberStateCounter++
    },

    async evt_READY() {
      if (!this.config.token) {
        const d = await this.request('AUTHORIZE', {
          client_id: process.env.DISCORD_ID,
          scopes: ['rpc', 'identify'],
          prompt: 'none',
        })
        console.log('authorize', d)
        this.config = await this.$api.code(d.code)
      }
      await this.request('AUTHENTICATE', { access_token: this.config.token })
      await this.request('SUBSCRIBE', {}, 'VOICE_CHANNEL_SELECT')
      const channel = await this.request('GET_SELECTED_VOICE_CHANNEL')
      if (channel) this.subscribe(channel.id)
    },

    async evt_VOICE_CHANNEL_SELECT({ channel_id }) {
      this.subscribe(channel_id)
    },

    async evt_VOICE_STATE_CREATE(v) {
      this.members.set(v.user.id, {
        id: v.user.id,
        avatar: v.user.avatar,
        name: v.nick,
        speaking: false,
      })
      this.memberStateCounter++
    },

    async evt_VOICE_STATE_UPDATE(v) {
      const m = this.members.get(v.user.id)
      if (m) {
        m.avatar = v.user.avatar
        m.name = v.nick
        this.memberStateCounter++
      }
    },

    async evt_VOICE_STATE_DELETE(v) {
      this.members.delete(v.user.id)
      this.memberStateCounter++
    },

    async evt_SPEAKING_START({ user_id }) {
      const m = this.members.get(user_id)
      if (m) {
        m.speaking = true
        this.memberStateCounter++
      }
    },

    async evt_SPEAKING_STOP({ user_id }) {
      const m = this.members.get(user_id)
      if (m) {
        m.speaking = false
        this.memberStateCounter++
      }
    },

    connect(tries = 0) {
      if (this.socket) return

      try {
        const port = 6463 + (tries % 10)
        this.socket = new WebSocket(`ws://127.0.0.1:${port}/?v=1&client_id=${process.env.DISCORD_ID}`)
      } catch (_) {
        this._handleClose({ code: 1006 })
        return
      }

      this.socket.onclose = this._handleClose.bind(this)
      this.socket.onmessage = this._handleMessage.bind(this)
    },

    /* async */ request(cmd, args, evt) {
      if (!this.socket) return

      const nonce = `counter:${++this.commandCounter}`

      const p = new Promise((resolve, reject) => {
        this.pendingCommands[nonce] = { resolve, reject }
      })

      this.socket.send(JSON.stringify({ cmd, args, evt, nonce }))

      return p
    },

    _handleClose(e) {
      console.error('WS Closed: ', e)

      try {
        this.socket.close()
      } catch (e) {}

      this.socket = null

      const tries = e.code === 1006 ? ++this.connectionTries : 0
      const backoff = Math.pow(2, Math.floor(tries / 10))
      setTimeout(() => this.connect(tries), backoff)
    },

    _handleMessage(message) {
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
        if (this[method]) {
          this[method](data)
        }
        return
      }

      if (!this.pendingCommands[nonce]) return
      const { resolve, reject } = this.pendingCommands[nonce]
      delete this.pendingCommands[nonce]

      if (evt === 'ERROR') {
        const error = new Error(data.message)
        error.code = data.code
        reject(error)
      } else {
        resolve(data)
      }
    },

    evt_ERROR(data) {
      console.error('Dispatched Error: ', data)
      this.socket.close()
    },
  },
}
</script>

<style>
body {
  color: white;
  background: black;
}

.grid {
  display: grid;
  height: 100vh;
}

.member {
  background-size: cover;
  background-position: top center;
  background-repeat: no-repeat;
  filter: brightness(50%);
  transition: filter 200ms linear;
}

.member.speaking {
  filter: brightness(100%);
}

.bounce .member {
  position: relative;
  top: 10px;
}

.bounce .member.speaking {
  animation: 200ms bounce;
}

@keyframes bounce {
  0% {
    top: 10px;
  }
  50% {
    top: 0px;
  }
  100% {
    top: 10px;
  }
}
</style>

