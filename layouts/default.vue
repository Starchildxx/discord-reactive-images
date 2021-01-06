<template>
  <v-app dark>
    <v-app-bar app>
      <v-toolbar-title class="hidden-xs-only">Discord Reactive Images</v-toolbar-title>
      <v-spacer />

      <template v-if="$user">
        <v-avatar>
          <img :src="`https://cdn.discordapp.com/avatars/${$user.id}/${$user.avatar}.png?size=64`" />
        </v-avatar>
        <span class="ml-4">{{ $user.username }}#{{ $user.discriminator }}</span>
        <v-btn class="ml-4" outlined color="primary" to="/manage" nuxt>Manage</v-btn>
        <v-btn class="ml-4" outlined color="red" :href="logout()">Logout</v-btn>
      </template>

      <template v-else>
        <v-btn outlined color="primary" :href="login('discord')">Login</v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <nuxt />
    </v-main>
  </v-app>
</template>

<script>
export default {
  methods: {
    login(platform) {
      return `/auth/${platform}/login?path=${encodeURIComponent(this.$route.fullPath)}`
    },
    logout() {
      return `/auth/logout?path=${encodeURIComponent(this.$route.fullPath)}`
    },
  },
}
</script>

<style>
html {
  overflow-y: auto;
}
</style>
