<template>
  <v-app dark>
    <v-overlay :value="error">
      <v-alert type="error" outlined>{{ error }}</v-alert>
    </v-overlay>
    <div class="grid" :class="{ bounce: config.bounce, speaking: member.speaking }">
      <div class="member inactive" :style="{backgroundImage: inactiveImg}"></div>
      <div class="member speaking" :style="{backgroundImage: speakingImg}"></div>
    </div>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, computed, useContext } from '@nuxtjs/composition-api'
import { useDiscordRPC, Member } from '~/assets/discordrpc'

export default defineComponent({
  setup() {
    // @ts-ignore
    const { params } = useContext()
    const { members, config, error } = useDiscordRPC()

    const member = computed(() => {
      return members.value.find((m) => m.id === params.value.discord_id) || <Member>{}
    })

    const inactiveImg = computed(() => member.value && member.value.images ? `url(${member.value.images.inactive})` : '')
    const speakingImg = computed(() => member.value && member.value.images ? `url(${member.value.images.speaking})` : '')

    return {
      error,
      config,
      member,
      inactiveImg,
      speakingImg
    }
  },
})
</script>

<style>
body {
  color: white;
  background: black;
}

.v-application {
  background: none !important;
  color: inherit !important;
}

.grid {
  display: grid;
  height: 100vh;
  overflow: hidden;
}

.member {
  grid-area: 1 / 1;
  background-size: contain;
  background-position: top center;
  transition: opacity 200ms linear;
}

.member.inactive {
  filter: brightness(50%);
  opacity: 1;
}
.speaking .member.inactive {
  opacity: 0;
}

.member.speaking {
  opacity: 0;
  z-index: 1;
}
.speaking .member.speaking {
  opacity: 1;
}

.bounce .member {
  position: relative;
  top: 10px;
}

.bounce.speaking .member {
  animation: 200ms bounce;
}

.member img {
  width: 100%;
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

