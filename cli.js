#!/usr/bin/env node
const simpleGit = require('simple-git/promise')
const crypto = require('crypto')
const H = require('escape-html-template-tag')
const fs = require('fs')
const globby = require('globby')

const path = '.'
const buildTop = 'build-site'
const build = `./${buildTop}/`
const git = simpleGit(path)

// ONLY works in repo root because checkout-index is relative, I guess

// only works if it's safe to checkout -- else aborts

async function main () {
  const out = []

  out.push(`<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>List of versions</title>
    <link rel="stylesheet" href="/style.css">
  </head>
  <body>
    <div class="container-lg px-3 my-5 markdown-body">
`)
  
  try {
    await git.checkout('master')
  } catch (e) {
    return
  }
  let tag = 'live'
  let started
  let first = true

  function startTag () {
    if (started) out.push(`</ul>`)
    started = true
    out.push(H`<h2><a href="${tag}/">${tag}</a></h2><ul>`)
  }

  startTag()
  // console.log('tag', tag)
  
  for (const entry of (await git.log()).all) {
    // console.log('***', entry.date, entry.hash, entry.refs, entry)

    // is a tag different from a log entry with ref: 'tag: ' ? 
    const m = entry.refs.match(/tag: (v[\d\.]+)/)
    if (!m) {
      out.push(H`<li>${entry.message}</li>`)
      // console.log(' change message: ', entry.message)
      continue
    }

    tag = m[1]

    
    startTag()
    // console.log('tag', tag)
    
    const prefix = `${build}/${tag}/`
    // console.log('checking out %o into %o', tag, prefix)
    try {
      await git.checkout(tag)
    } catch (e) {
      // git already sends err.message to stderr
      //
      // probably because it's not safe to switch branches
      return
    }
    // console.log(' - checked out')
    await git.raw([
      'checkout-index',
      '-a',  // all files
      '-f',  // overwrite existing files
      '-u',  // update state information
      `--prefix=${prefix}`
    ])

    // console.log(' - files copied')
    // console.log('% more about %o', entry)
    let msg
    if (first) {
      msg = `Latest Release (${tag})`
      first = false
    } else {
      msg = `Superseded.`
    }
    await writeStatus(prefix, msg)
  }

  if (started) out.push('</ul>')
  out.push(`</div></body></html>`)

  // I wonder if that stuff will all get lost when we do the checkout master?
  // maybe .gitignore build-site
  await git.checkout('master')

  await copyLive()
  fs.writeFileSync(build + 'index.html', out.join('\n'))
  console.log('wrote tree: %o', build)
}

async function copyLive () {
  fs.mkdirSync(build + 'live', { recursive: true })
  for (const filename of await globby(['*'], {
    expandDirectories: true,
    gitignore: true
  })) {
    console.log(filename)
    if (filename === buildTop) {
      console.error(`Put ${buildTop} in your .gitignore and git rm it, or this will get crazy`)
      process.exit(1)
    }
    const livetext = fs.readFileSync(filename, 'utf8')
    fs.writeFileSync(build + 'live/' + filename, livetext)
  }
  await writeStatus(build + 'live', 'Live (no release number)')
}

async function writeStatus(dir, comment) {
  fs.writeFileSync(dir + '/status.html', status({hash, comment}))
}

function hash (text) {
  const hasher = crypto.createHash('sha256')
  hasher.update(text)
  const sha = hasher.digest('hex')
  return sha
}

function status ({hash, comment}) {
  return H`${html('status')}
    <div style="margin: 0; background-color: #CCF; padding: 0.5em; border: 1px solid black;">
      <p style="margin-top: 0">Status of this document: ${comment}. See <a href=".." target="_top">other versions</a></p>
      <p style="margin-bottom: 0; font-size: 80%">The contents of this status box are not part of this specification and may be updated. Archival snapshot SHA-256 ${hash}</p>
    </div>
  </body>
</html>`
}

function html (title) {
  return H`<!doctype html><html lang="en">
 <head>
  <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
    <title>${title}</title>
  <meta content="width=device-width, initial-scale=1, shrink-to-fit=no" name="viewport">
  <style>
  </style>
  </head>
  <body>
`
}

main()
