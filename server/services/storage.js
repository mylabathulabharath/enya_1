import fs from 'fs'
import path from 'path'

const DATA_DIR = path.resolve(process.cwd(), 'data')

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

ensureDataDir()

export const storagePaths = {
  jobs: path.join(DATA_DIR, 'jobs.json'),
  nodes: path.join(DATA_DIR, 'nodes.json'),
}

export function readJsonFile(filePath, defaultValue) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue
    }
    console.error(`[Storage] Failed to read ${filePath}:`, error.message)
    return defaultValue
  }
}

export function writeJsonFile(filePath, data) {
  try {
    ensureDataDir()
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error(`[Storage] Failed to write ${filePath}:`, error.message)
  }
}

