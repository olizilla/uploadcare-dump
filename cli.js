#!/usr/bin/env node

import sade from 'sade'
import path from 'node:path'
import { parse } from 'smol-toml'
import ndjson from 'iterable-ndjson'
import { pipeline } from 'stream/promises'
import { readFile, mkdir } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'fs'
import { fetchMetadata, fetchFile, fetchProject } from './uploadcare.js'

const cli = sade('uploadcare-dump')

cli
  .version(1)
  .option('-c, --config', 'Provide path to custom config', 'config.toml')

cli
  .command('meta', 'dump metadata about files')
  .action(dumpMeta)

cli
  .command('files', 'use meta.json to dump files')
  .action(dumpFiles)

cli
  .command('all', 'dump metadata and files', { default: true })
  .action(dumpAll)

cli
  .command('conf', 'check config.toml is valid')
  .action(checkConf)

cli.parse(process.argv)

async function dumpAll (opts) {
  await dumpMeta(opts)
  await dumpFiles(opts)
}

async function dumpMeta ({ config }) {
  const conf = await readConf(config)
  for (const p of conf.projects) {
    console.log(`# Fetching meta.json for ${p.name}...`)
    const outDir = p.name
    const metaFile = path.join(outDir, 'meta.ndjson')
    try {
      await mkdir(outDir)
    } catch (err) {
      if (err.code && err.code !== 'EEXIST') {
        throw err
      }
    }
    await pipeline(
      fetchMetadata(p),
      async function * (source) {
        for await (const item of source) {
          yield `${JSON.stringify(item)}\n`
        }
      },
      createWriteStream(metaFile)
    )
  }
}

async function dumpFiles ({ config }) {
  const conf = await readConf(config)
  let count = 0
  for (const p of conf.projects) {
    const outDir = p.name
    const metaFile = path.join(outDir, 'meta.ndjson')
    const source = createReadStream(metaFile)
    console.log(`\n# Fetching files for ${p.name}...`)
    for await (const meta of ndjson.parse(source)) {
      console.log(meta.originalFileUrl)
      await fetchFile(outDir, meta)
      count++
    }
  }
  console.log(`\n# Done. Fetched ${count} files.`)
}

async function readConf (pathname = 'config.toml') {
  let file
  try {
    file = await readFile(pathname, { encoding: 'utf8' })
  } catch (err) {
    console.error(`Failed to read config at ./${pathname}, (${err.message})`)
    process.exit(1)
  }
  try {
    return parse(file)
  } catch (err) {
    console.error(`Failed to parse config at ./${pathname}. (${err.message})`)
    process.exit(1)
  }
}

async function checkConf ({ config }) {
  const conf = await readConf(config)
  const pubKeys = new Map()
  const names = new Map()
  const issues = []
  if (!conf.projects || conf.projects.length === 0) {
    issues.push('Config error: create a config.toml file with a [[projects]] block for each project you want to dump')
  } else {
    for (const p of conf.projects) {
      if (!p.name) {
        issues.push('Config error: Set "name" for each project.', p)
      }
      if (!p.publicKey) {
        issues.push('Config error: Set "publicKey" for each project.', p)
      }
      if (!p.secretKey) {
        issues.push('Config error: Set "secretKey" for each project.', p)
      }
      if (names.has(p.name)) {
        issues.push(`Config error: Each project should have a unique name. name "${p.name}" appears more than once.`)
      }
      if (pubKeys.has(p.publicKey)) {
        issues.push(`Config error: Each project should have a unique publicKey. publicKey for "${p.name}" also used for "${pubKeys.get(p.publicKey).name}". `)
      }
      pubKeys.set(p.publicKey, p)
      names.set(p.name, p)
    }
  }
  if (issues.length > 0) {
    for (const item of issues) {
      console.error(item)
    }
    process.exit(1)
  }

  // use credentials to get workspace info from api
  for (const p of conf.projects) {
    const res = await fetchProject(p)
    console.log('[[projects]]')
    console.log(`name = "${p.name}"`)
    console.log('# api response: ')
    console.log(JSON.stringify(res))
    if (p.name !== res.name) {
      console.warn(`# Warning: project name in config ("${p.name}") does not match name from api ("${res.name}"). Config name will be used.`)
    }
    console.log('')
  }
}
