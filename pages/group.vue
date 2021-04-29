<template>
  <div>
    <v-overlay :value="error">
      <v-alert type="error" outlined>{{ error }}</v-alert>
    </v-overlay>
    <div class="grid" :class="{ bounce: config.bounce }" :style="gridStyle">
      <div
        v-for="m in visibleMembers"
        :key="m.id"
        class="member"
        :class="{ speaking: m.speaking }"
        :style="memberStyle"
      >
        <div class="inactive">
          <v-spacer />
          <img :src="m.images.inactive" />
        </div>
        <div class="speaking">
          <v-spacer />
          <img :src="m.images.speaking" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@nuxtjs/composition-api'
import { useDiscordRPC } from '~/assets/discordrpc'

export default defineComponent({
  layout: 'empty',
  setup() {
    const { members, config, error } = useDiscordRPC()

    const visibleMembers = computed(() => {
      return members.value.filter((m) => config.value.includeSelf || m.id !== config.value.id)
    })

    const gridStyle = computed(() => {
      return {
        'grid-template-columns': `repeat(${visibleMembers.value.length}, 1fr)`,
        padding: `0 calc(-1 * ${config.value.gapPercentage}% / ${visibleMembers.value.length})`,
      }
    })

    const memberStyle = computed(() => {
      return {
        margin: `0 ${config.value.gapPercentage}%`,
      }
    })

    return {
      error,
      config,
      visibleMembers,
      gridStyle,
      memberStyle,
    }
  },
})
</script>

<style>
body {
  color: white;
  background: black;
}

.grid {
  display: grid;
  height: 100vh;
  overflow: hidden;
}

.member {
  display: grid;
}

.bounce .member {
  position: relative;
  top: 10px;
}

.bounce .member.speaking {
  animation: 200ms bounce;
}

.member > div {
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  max-height: 100vh;
  transition: opacity 200ms linear;
}

.member .inactive {
  filter: brightness(50%);
  opacity: 1;
}
.member.speaking .inactive {
  opacity: 0;
}

.member .speaking {
  opacity: 0;
  z-index: 1;
}
.member.speaking .speaking {
  opacity: 1;
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

