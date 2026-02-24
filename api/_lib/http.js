const defaultHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

export const sendJson = (res, status, payload) => {
  res.status(status).setHeader('Content-Type', defaultHeaders['Content-Type'])
  res.setHeader('Cache-Control', defaultHeaders['Cache-Control'])
  res.end(JSON.stringify(payload))
}

export const sendError = (res, status, message, code = 'ERROR', extra = {}) => {
  sendJson(res, status, {
    ok: false,
    code,
    message,
    ...extra,
  })
}

export const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  if (typeof req.body === 'string') {
    return req.body ? JSON.parse(req.body) : {}
  }

  return await new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('JSON invalido no body da requisicao.'))
      }
    })

    req.on('error', (error) => {
      reject(error)
    })
  })
}
