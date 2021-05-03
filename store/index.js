export const state = () => ({
  tutorial: 0
})

export const mutations = {
  setTutorial(state, step) {
    state.tutorial = step
  }
}
