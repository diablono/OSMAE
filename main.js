const { app, BrowserWindow, ipcMain, shell, dialog, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { exec, spawn } = require('child_process')

// Config paths
const CONFIG_DIR = path.join(os.homedir(), '.aiko-os')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

// AIOS Kernel process
let aiKernel = null

// Ensure config dir exists
if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })

// Load config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  } catch {}
  return { apiKey: '', theme: 'dark', robotName: 'AIKO-7', volume: 80 }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

function startAIOS() {
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
  const kernelPath = path.join(__dirname, 'backend', 'ai_kernel.py')

  aiKernel = spawn(pythonPath, [kernelPath])

  aiKernel.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString())
      console.log('AIOS Kernel Output:', response)
      if (mainWindow) mainWindow.webContents.send('aios-response', response)
    } catch (e) {
      console.warn('AIOS Non-JSON Output:', data.toString())
    }
  })

  aiKernel.stderr.on('data', (data) => {
    console.error(`AIOS Kernel Error: ${data}`)
  })

  aiKernel.on('close', (code) => {
    console.log(`AIOS Kernel process exited with code ${code}`)
  })
}

let mainWindow
let config = loadConfig()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,           // No OS title bar — AIKO has its own
    titleBarStyle: 'hidden',
    backgroundColor: '#050a14',
    icon: path.join(__dirname, 'images/IconMaeAI.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))

  // Open DevTools in dev mode
  if (process.env.AIKO_DEV) mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  startAIOS()
  createWindow()
  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

// Config
ipcMain.handle('get-config', () => config)
ipcMain.handle('save-config', (_, newConfig) => {
  config = { ...config, ...newConfig }
  saveConfig(config)
  return config
})

// System info
ipcMain.handle('get-system-info', async () => {
  const cpus = os.cpus()
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuCount: cpus.length,
    uptime: os.uptime(),
    homeDir: os.homedir(),
    username: os.userInfo().username
  }
})

// File system operations
ipcMain.handle('fs-list', async (_, dirPath) => {
  try {
    const targetPath = dirPath || os.homedir()
    const entries = fs.readdirSync(targetPath, { withFileTypes: true })
    return {
      path: targetPath,
      entries: entries.map(e => ({
        name: e.name,
        isDir: e.isDirectory(),
        isFile: e.isFile(),
        size: e.isFile() ? fs.statSync(path.join(targetPath, e.name)).size : 0,
        mtime: fs.statSync(path.join(targetPath, e.name)).mtime
      })).sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name))
    }
  } catch (err) {
    return { error: err.message, path: dirPath, entries: [] }
  }
})

ipcMain.handle('fs-read', async (_, filePath) => {
  try {
    const stat = fs.statSync(filePath)
    if (stat.size > 5 * 1024 * 1024) return { error: 'File too large (>5MB)' }
    return { content: fs.readFileSync(filePath, 'utf8') }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('fs-write', async (_, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8')
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('fs-delete', async (_, filePath) => {
  try {
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) fs.rmdirSync(filePath, { recursive: true })
    else fs.unlinkSync(filePath)
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('fs-mkdir', async (_, dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections']
  })
  return result
})

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return result
})

// Execute shell commands via AIOS Scheduling (TSC: Tool System Call)
ipcMain.handle('exec-command', async (_, cmd) => {
  return new Promise((resolve) => {
    const baseCmd = cmd.trim().split(' ')[0]
    // Basic safety check
    if (cmd.includes('rm -rf /') || cmd.includes('dd if=') || cmd.includes('mkfs')) {
      resolve({ error: 'Lệnh này bị AIKO chặn vì lý do an toàn 🛡️' })
      return
    }

    // Wrap command as an AIOS task
    const task = {
        agent_id: 'system',
        action: 'tool_call',
        payload: { tool: 'shell', args: cmd }
    }
    
    // Send to AI Kernel (TSC Dispatch)
    if (aiKernel && aiKernel.stdin) {
        aiKernel.stdin.write(JSON.stringify(task) + '\n')
    }

    // Also execute natively for now (hybrid mode)
    exec(cmd, { timeout: 10000, cwd: os.homedir() }, (err, stdout, stderr) => {
      resolve({ stdout: stdout || '', stderr: stderr || '', error: err?.message || null, code: err?.code || 0 })
    })
  })
})

// AIOS Dispatcher (LSC: LLM System Call)
ipcMain.handle('aios-dispatch', async (_, agentId, query) => {
    const task = {
        agent_id: agentId,
        action: 'query',
        payload: query
    }
    if (aiKernel && aiKernel.stdin) {
        aiKernel.stdin.write(JSON.stringify(task) + '\n')
        return { success: true, message: 'Task scheduled in AIOS Kernel' }
    }
    return { success: false, error: 'AIOS Kernel not running' }
})

// Open URL in system browser
ipcMain.on('open-external', (_, url) => shell.openExternal(url))

// Notification
ipcMain.on('show-notification', (_, { title, body }) => {
  new Notification({ title: title || 'AIKO-OS', body }).show()
})

// Get memory stats (live)
ipcMain.handle('get-memory-stats', () => ({
  total: os.totalmem(),
  free: os.freemem(),
  used: os.totalmem() - os.freemem()
}))
