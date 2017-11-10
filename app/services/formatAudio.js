const { createApolloFetch } = require('apollo-fetch')
const formatAudioEndpoint = process.env.FORMAT_AUDIO_ENDPOINT || `http://localhost:3030/graphql`

const formatAudio = (audioUrl) => {
  const fetch = createApolloFetch({
    uri: formatAudioEndpoint
  })

  const variables = {
    audioUrl
  }

  const formatAudioMutation = `
    mutation formatAudio($audioUrl:String!){
      formatAudioFile(audioUrl:$audioUrl){
        url
      }
    }
  `

  return fetch({
    query: formatAudioMutation,
    variables
  }).then(body => {
    let data = body.data
    if (!data) {
      throw new Error(`call format Audio service failed`)
    }
    return data.formatAudioFile.url
  })
}

module.exports = formatAudio
