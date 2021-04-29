<template>
  <v-container fluid :fill-height="!$user">
    <v-row v-if="!$user" justify="center" align="center">
      <v-col cols="auto">
        <v-btn x-large outlined color="primary" :href="login('discord')">Login</v-btn>
      </v-col>
    </v-row>
    <v-row v-else>
      <v-col cols="12">
        <v-alert v-if="error" class="mb-0" type="error" outlined>
          {{ error }}
        </v-alert>
      </v-col>
      <v-col cols="12" md="4" lg="6" order-md="last">
        <v-card class="mb-4">
          <v-card-title> Links </v-card-title>
          <v-card-text>
            <v-text-field v-for="l in links" :key="`link-${l.value}`" :label="l.label" :value="l.value" readonly>
              <template slot="append">
                <v-tooltip top>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn icon @click.prevent="copyText(l.value)" v-bind="attrs" v-on="on">
                      <v-icon>mdi-content-copy</v-icon>
                    </v-btn>
                  </template>

                  <span>Copy to Clipboard</span>
                </v-tooltip>
              </template>
              <template slot="append-outer">
                <v-dialog width="800">
                  <template v-slot:activator="{ on: dialogO, attrs: dialogA }">
                    <v-tooltip top>
                      <template v-slot:activator="{ on: tooltipO, attrs: tooltipA }">
                        <v-btn
                          icon
                          v-bind="{ ...dialogA, ...tooltipA }"
                          v-on="{ ...dialogO, ...tooltipO }"
                          :disabled="!l.settings"
                        >
                          <v-icon>mdi-cog</v-icon>
                        </v-btn>
                      </template>

                      <span>Settings</span>
                    </v-tooltip>
                  </template>

                  <v-card v-if="l.settings">
                    <v-card-title class="justify-center">{{ l.settings.name }} Settings</v-card-title>
                    <v-card-text>
                      <v-row justify="center">
                        <v-col cols="12" sm="6">
                          <image-upload
                            class="inactive-image"
                            title="Set Inactive Image"
                            v-model="l.settings.inactive"
                            :fallback="l.settings.speaking"
                            :user="l.settings.id"
                            :avatar="l.settings.avatar"
                            purpose="inactive"
                          />
                        </v-col>
                        <v-col cols="12" sm="6">
                          <image-upload
                            class="speaking-image"
                            title="Set Speaking Image"
                            v-model="l.settings.speaking"
                            :fallback="l.settings.inactive"
                            :user="l.settings.id"
                            :avatar="l.settings.avatar"
                            purpose="speaking"
                          />
                        </v-col> </v-row
                    ></v-card-text>
                  </v-card>
                </v-dialog>
              </template>
            </v-text-field>

            <div class="text-caption">
              Copy one of the links above and add it to OBS as a browser source. Set the height & width to the max size
              you're willing for the images to take up.
              <strong>Warning:</strong> Images can re-arrange or re-size when users join or leave, so do not rely on
              this to hide sensitive information like Among Us room codes.
            </div>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title> Config </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="saveConfig">
              <v-switch label="Include Self" v-model="config.includeSelf"></v-switch>
              <v-switch label="Bounce Effect" v-model="config.bounce"></v-switch>
              <v-slider label="Image Spacing" v-model="config.gapPercentage" min="-500" max="50" thumb-label></v-slider>

              <v-btn block color="primary" type="submit" :disabled="configSaving" :loading="configSaving">Apply</v-btn>

              <v-alert v-if="configError" class="mt-4" type="error">
                {{ configError }}
              </v-alert>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="3">
        <image-upload
          class="inactive-image"
          title="Set Inactive Image"
          v-model="currentImages.inactive"
          :fallback="currentImages.speaking"
          :user="$user.id"
          :avatar="$user.avatar"
          purpose="inactive"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="3">
        <image-upload
          class="speaking-image"
          title="Set Speaking Image"
          v-model="currentImages.speaking"
          :fallback="currentImages.inactive"
          :user="$user.id"
          :avatar="$user.avatar"
          purpose="speaking"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, computed, useContext, toRefs, reactive, ref } from '@nuxtjs/composition-api'
import { useDiscordRPC } from '~/assets/discordrpc'

interface Link {
  label: String
  value: String
  settings?: {
    id: String
    name: String
    avatar: String
    speaking?: String
    inactive?: String
  }
}

export default defineComponent({
  setup() {
    // @ts-ignore
    const { $api, $user, $route } = useContext()

    const { members, config, error } = useDiscordRPC()

    const data = reactive({
      configError: null,
      configSaving: false,
    })

    const currentImages = ref({
      inactive: null,
      speaking: null,
    })
    if ($user) {
      $api.get_image($user.id).then((v: any) => {
        currentImages.value = v
      })
    }

    const otherMembers = computed(() => {
      return members.value.filter((m) => m.id !== config.value.id)
    })

    const links = computed(() => {
      const r: Link[] = [
        {
          label: 'Group Browser Source',
          value: 'https://discord-reactive-images.fugi.tech/group',
        },
        {
          label: 'Individual Browser Source (You)',
          value: `https://discord-reactive-images.fugi.tech/individual/${$user && $user.id}`,
        },
      ]

      for (const m of otherMembers.value) {
        r.push({
          label: `Individual Browser Source (${m.name})`,
          value: `https://discord-reactive-images.fugi.tech/individual/${m.id}`,
          settings: {
            id: m.id,
            name: m.name,
            avatar: m.avatar,
            speaking: m.rawImages?.speaking,
            inactive: m.rawImages?.inactive,
          },
        })
      }

      return r
    })

    return {
      error,
      config,
      ...toRefs(data),
      currentImages,
      otherMembers,
      links,
      login(platform: string) {
        return `/auth/${platform}/login?path=${encodeURIComponent($route?.fullPath || '/manage')}`
      },
      async saveConfig() {
        data.configSaving = true

        try {
          await $api.set_config({
            includeSelf: config.value.includeSelf,
            bounce: config.value.bounce,
            gapPercentage: config.value.gapPercentage,
          })

          data.configError = null
        } catch (err) {
          data.configError = err.message
        }

        data.configSaving = false
      },
      copyText(text: string) {
        navigator.clipboard.writeText(text)
      },
    }
  },
})
</script>

<style>
.inactive-image .v-image {
  filter: brightness(50%);
}
</style>
