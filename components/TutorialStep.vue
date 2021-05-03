<template>
  <v-tooltip
    :activator="activator"
    :position-x="positionX"
    :position-y="positionY"
    :value="tutorial == step"
    :open-on-hover="false"
    :open-on-click="false"
    :open-on-focus="false"
    :left="left"
    :right="right"
    :top="top"
    :bottom="bottom"
    max-width="min(50vw, 400px)"
    eager
  >
    <div>
      <slot />
    </div>
    <div class="my-2 d-flex">
      <v-btn v-if="!final" outlined color="red" @click="setTutorial(0)">Exit</v-btn>
      <v-spacer />
      <v-btn v-if="final" outlined color="green" @click="setTutorial(0)">Finish</v-btn>
      <v-btn v-else outlined color="green" @click="setTutorial(step + 1)">Next</v-btn>
    </div>
  </v-tooltip>
</template>


<script lang="ts">
import { defineComponent, computed, useStore } from '@nuxtjs/composition-api'

interface State {
  tutorial: Number
}

export default defineComponent({
  props: {
    activator: {
      type: String,
    },
    step: {
      type: Number,
      required: true,
    },
    final: {
      type: Boolean,
    },
    left: {
      type: Boolean,
    },
    right: {
      type: Boolean,
    },
    top: {
      type: Boolean,
    },
    bottom: {
      type: Boolean,
    },
  },
  setup(props) {
    const store = useStore<State>()

    const tutorial = computed(() => {
      return store.state.tutorial
    })

    const positionX = computed(() => {
      return !!props.activator ? 0 : window.innerWidth / 2
    })

    const positionY = computed(() => {
      return !!props.activator ? 0 : window.innerHeight / 2
    })

    return {
      tutorial,
      positionX,
      positionY,
      setTutorial: (step: number) => {
        store.commit('setTutorial', step)
      },
    }
  }
})
</script>

<style scoped>
.v-tooltip__content {
  pointer-events: inherit;
}
</style>
