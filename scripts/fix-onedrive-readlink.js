/**
 * Windows/OneDrive compatibility shim for the Next.js dev server.
 *
 * This project lives in a OneDrive-synced folder (kept deliberately, for its
 * version history). OneDrive marks files and folders under .next as reparse
 * points. Node's readdir reports those as symbolic links even though they are
 * not, so Next.js's cache cleanup calls fs.readlink on them — which throws
 * EINVAL on Windows for this kind of reparse point, and the dev server refuses
 * to start.
 *
 * Next.js's own `cleanDistDir: false` option does not help here: it is honoured
 * by the build path only, while the dev server's clean() runs unconditionally.
 *
 * The patch is applied at readdir, not at readlink. Returning a substitute path
 * from readlink is wrong: Next.js then stats it, sees a directory, and recurses
 * into the same directory forever until the process runs out of memory.
 *
 * Two things keep this cheap:
 *   1. Only paths inside the Next.js build directory are inspected. Everything
 *      else passes through untouched, so ordinary file walking (which includes
 *      node_modules) pays nothing.
 *   2. Entries are only rewritten when they genuinely misreport themselves, so
 *      real symlinks keep their behaviour.
 *
 * Loaded via `node --require` from the dev script only. The build does not need
 * it, because `cleanDistDir: false` covers that path.
 */

const fs = require('fs')
const path = require('path')
const fsp = require('fs/promises')

const originalReaddir = fsp.readdir
const originalReaddirSync = fs.readdirSync
const originalReadlinkSync = fs.readlinkSync

/** A reparse point that is not a real symlink. */
function isNotASymlink(error) {
  return Boolean(error) && (error.code === 'EINVAL' || error.code === 'UNKNOWN')
}

/**
 * True when the directory is part of the Next.js build output. The check is
 * deliberately loose (any path segment named .next) so it holds regardless of
 * how the directory is spelled.
 */
function isBuildDir(dir) {
  if (typeof dir !== 'string') {
    try {
      dir = String(dir)
    } catch {
      return false
    }
  }
  return /(^|[\\/])\.next([\\/]|$)/.test(dir)
}

/** Wraps a dirent so isSymbolicLink() reports false, inheriting everything else. */
function asNonSymlink(entry) {
  const wrapper = Object.create(entry)
  Object.defineProperty(wrapper, 'isSymbolicLink', {
    value: () => false,
    enumerable: false,
    configurable: true,
  })
  return wrapper
}

/** True when the entry claims to be a symlink but readlink disagrees. */
function isFalseSymlink(entry, fullPath) {
  if (typeof entry.isSymbolicLink !== 'function' || !entry.isSymbolicLink()) {
    return false
  }
  try {
    originalReadlinkSync(fullPath)
    return false // a genuine symlink
  } catch (error) {
    return isNotASymlink(error)
  }
}

function patchEntries(entries, dir) {
  let changed = false
  const patched = entries.map((entry) => {
    if (!entry || typeof entry.isSymbolicLink !== 'function') return entry
    const full = path.join(dir, entry.name)
    if (isFalseSymlink(entry, full)) {
      changed = true
      return asNonSymlink(entry)
    }
    return entry
  })
  return changed ? patched : entries
}

fsp.readdir = async function patchedReaddir(dir, options) {
  const result = await originalReaddir.call(fsp, dir, options)
  const withFileTypes =
    options && typeof options === 'object' && options.withFileTypes === true
  if (!withFileTypes || !isBuildDir(dir)) return result
  return patchEntries(result, dir)
}

fs.readdirSync = function patchedReaddirSync(dir, options) {
  const result = originalReaddirSync.call(fs, dir, options)
  const withFileTypes =
    options && typeof options === 'object' && options.withFileTypes === true
  if (!withFileTypes || !isBuildDir(dir)) return result
  return patchEntries(result, dir)
}

if (fs.promises && fs.promises !== fsp) {
  fs.promises.readdir = fsp.readdir
}
