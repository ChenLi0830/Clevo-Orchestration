const formatAudio = (url) => {
  return new Promise((resolve, reject) => {
    console.log('audio url', url)
    return resolve(url)
  })
}

module.exports = formatAudio
