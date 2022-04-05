const _ = require('lodash')
const axios = require('axios')
const okayHttpStatuses = [
  200,
  201,
  204,
  304
]
const errorParser = async (response) => {
  const { status, data } = response
  if (_.some(okayHttpStatuses, s => s === status)) {
    return response
  } else {
    return Promise.reject(new Error('网络错误'))
  }
}
const createInstance = (baseUrl, headers = {}) => {
  const timeout = 600 * 1000
  const instance = axios.create({
    baseURL: baseUrl,
    timeout,
    headers,
    validateStatus: () => true
  })
  instance.interceptors.response.use(errorParser)
  return instance
}

module.exports = {
  createInstance
}

