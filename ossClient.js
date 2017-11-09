var OSS = require('ali-oss').Wrapper

var client = new OSS({
// Todo: use external variables
//   region: 'oss-us-west-1',
  region: 'oss-cn-beijing',
  // 云账号AccessKey有所有API访问权限，建议遵循阿里云安全最佳实践，部署在服务端使用RAM子账号或STS，部署在客户端使用STS。
  accessKeyId: 'LTAIdHE0lzQmI2Kj',
  accessKeySecret: 'UI4l7QwjqTefrjUvy9EOAyeK9MfyEY',
  bucket: 'clevo-server-dev'
})

module.exports = client
