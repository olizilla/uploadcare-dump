import { mkdir, stat } from 'node:fs/promises'
import { createWriteStream, WriteStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { UploadcareAuthSchema, listOfFiles, paginate } from '@uploadcare/rest-client'

export async function * fetchMetadata (uploadCareAuth) {
  const authSchema = new UploadcareAuthSchema(uploadCareAuth)
  const res = paginate(listOfFiles)({}, { authSchema })
  for await (const page of res) {
    for (const info of page.results) {
      yield info
    }
  }
}

export async function fetchFile (outDir, { originalFileUrl, size }) {
  const url = new URL(originalFileUrl)
  const pathname = join(outDir, url.pathname.slice(1))
  await mkdir(dirname(pathname), { recursive: true })
  try {
    const fstat = await stat(pathname)
    if (fstat.size === size) {
      return
    }
  } catch (err) {
    // try and download anyway
  }
  const out = createWriteStream(pathname)
  const res = await fetch(originalFileUrl)
  res.body.pipeTo(WriteStream.toWeb(out))
}

// ugly reimplementation of the uploadcare makeApiRequest function
// to do their custom auth dance to get /project as the client doesn't
// export that fn
export async function fetchProject (uploadCareAuth) {
  const authSchema = new UploadcareAuthSchema(uploadCareAuth)
  const url = new URL('/project/', 'https://api.uploadcare.com')
  const req = new Request(url, {
    method: 'GET',
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  })
  const requestHeaders = await authSchema.getHeaders(req)
  const signedRequest = new Request(url, {
    method: 'GET',
    headers: requestHeaders
  })
  const res = await fetch(signedRequest)
  return res.json()
}
