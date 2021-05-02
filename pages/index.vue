<template>
  <v-app dark>
    <v-app-bar app>
      <v-toolbar-title class="hidden-xs-only">
        <nuxt-link to="/" exact class="title-link">
          Discord Reactive Images
        </nuxt-link>
      </v-toolbar-title>
      <v-spacer />

      <template v-if="$user">
        <v-btn outlined color="green">Tutorial</v-btn>
        <v-avatar class="ml-4">
          <img :src="`https://cdn.discordapp.com/avatars/${$user.id}/${$user.avatar}.png?size=64`" />
        </v-avatar>
        <span class="ml-4">{{ $user.username }}#{{ $user.discriminator }}</span>
        <v-btn class="ml-4" outlined color="red" :href="logout()">Logout</v-btn>
      </template>

      <template v-else>
        <v-btn outlined color="primary" :href="login('discord')">Login</v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <v-container :fluid="!!$user">
        <v-row v-if="!$user" justify="center">
          <v-col cols="12" lg="10" xl="8">
            <video src="https://cdn.discord-reactive-images.fugi.tech/dri_promo.mp4" muted autoplay loop></video>
            <div class="text-h2 text-center mb-4">Easy Discord to OBS integration</div>
            <div class="text-body-1 mb-4">
              Discord Reactive Images allows you to easily visualize your Discord voice call in OBS with a single browser
              source. It's like <a href="https://streamkit.discord.com/overlay">Discord Streamkit</a> but more customizable
              and easier to use. Just login with Discord, upload an image, join any voice channel and adjust the settings
              in real time.
            </div>
            <v-btn x-large block color="primary" :href="login('discord')">Login</v-btn>
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
                                :base="l.settings.inactiveBase"
                                :user="l.settings.id"
                                purpose="inactive"
                              />
                            </v-col>
                            <v-col cols="12" sm="6">
                              <image-upload
                                class="speaking-image"
                                title="Set Speaking Image"
                                v-model="l.settings.speaking"
                                :fallback="l.settings.inactive"
                                :base="l.settings.speakingBase"
                                :user="l.settings.id"
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
              :base="currentImages.base"
              :user="$user.id"
              purpose="inactive"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="3">
            <image-upload
              class="speaking-image"
              title="Set Speaking Image"
              v-model="currentImages.speaking"
              :fallback="currentImages.inactive"
              :base="currentImages.base"
              :user="$user.id"
              purpose="speaking"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <v-footer>
      <div class="text-caption">
        Made by <a href="https://twitter.com/Fugiman">Fugi</a>.
        <a href="https://github.com/Fugiman/discord-reactive-images">Source code available on Github</a>.
        For issues or suggestions at me on Twitter or file an issue on Github.
      </div>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, computed, useContext, toRefs, reactive, ref } from '@nuxtjs/composition-api'
import { useDiscordRPC } from '~/assets/discordrpc'

interface Link {
  label: string
  value: string
  settings?: {
    id: string
    name: string
    speaking?: string
    inactive?: string
    speakingBase: string
    inactiveBase: string
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
      base: null,
    })
    if ($user) {
      $api.get_image($user.id).then((v: any) => {
        currentImages.value = {
          ...v,
          base: `https://cdn.discordapp.com/avatars/${$user.id}/${$user.avatar}.png?size=1024`,
        }
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
            speaking: m.rawImages?.speakingOverride,
            inactive: m.rawImages?.inactiveOverride,
            speakingBase:
              (m.rawImages?.speaking && `https://cdn.discord-reactive-images.fugi.tech/${m.rawImages?.speaking}`) ||
              (m.rawImages?.inactive && `https://cdn.discord-reactive-images.fugi.tech/${m.rawImages?.inactive}`) ||
              `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=1024`,
            inactiveBase:
              (m.rawImages?.inactive && `https://cdn.discord-reactive-images.fugi.tech/${m.rawImages?.inactive}`) ||
              (m.rawImages?.speaking && `https://cdn.discord-reactive-images.fugi.tech/${m.rawImages?.speaking}`) ||
              `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=1024`,
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
        return `/auth/${platform}/login?path=${encodeURIComponent($route?.fullPath || '/')}`
      },
      logout() {
        return `/auth/logout?path=${encodeURIComponent($route?.fullPath || '/')}`
      },
      copyText(text: string) {
        navigator.clipboard.writeText(text)
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
    }
  },
})
</script>

<style>
.inactive-image .v-image {
  filter: brightness(50%);
}
</style>

<style scoped>
.title-link {
  color: inherit !important;
  text-decoration: none;
}

video {
  display: block;
  margin: 0 auto 40px;
  max-width: 100%;
  max-height: 720px;
}
</style>
