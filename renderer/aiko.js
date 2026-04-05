// ─── AIKO-OS Renderer Logic ───────────────────────────────────────

const API_URL = 'https://api.anthropic.com/v1/messages'

let config = {}
let chatHistory = []
let currentPath = ''
let termHistory = []
let termHistoryIdx = -1

// ─── AIOS Kernel Listener ──────────────────────────────────────────

window.aiko.onAiosResponse((data) => {
    console.log('AIOS Kernel Event:', data)
    const kernelDot = document.getElementById('stat-kernel-dot')
    const kernelText = document.getElementById('stat-kernel-text')
    const kernelDetail = document.getElementById('stat-kernel-detail')
    
    if (kernelDot && kernelText) {
        // Pulse animation for activity
        kernelDot.classList.add('pulse')
        setTimeout(() => kernelDot.classList.remove('pulse'), 500)
        
        if (data.status === "processing") {
            kernelText.innerText = `Kernel: Processing...`
            kernelDetail.innerText = `Agent: ${data.agent_id} is active`
        } else if (data.response) {
            const source = data.response.source === "local_ai" ? "🛡️ Local AI" : "☁️ Cloud/Sim"
            kernelText.innerText = `Agent: ${data.agent_id}`
            kernelDetail.innerText = `${source} | ${data.response.type}`
            
            // If it's a Terminal response or Chat response, handle it
            if (data.response.type === "llm_response" && data.agent_id === "chat") {
                // Future point: Append to chat UI from kernel
            }
        }
    }
})

function simulateMultiAgent() {
    console.log('Starting AIOS Multi-Agent Simulation...')
    window.aiko.notify('AIOS Kernel', 'Đang bắt đầu mô phỏng lập lịch đa Agent...')
    
    // Simulate 3 agents submitting tasks at once
    const agents = ['FileAgent', 'WebAgent', 'CodeAgent']
    agents.forEach((id, i) => {
        setTimeout(() => {
            window.aiko.aiosDispatch(id, `Task from ${id}: Analyzing system...`)
        }, i * 200) // Small delay in submission
    })
}

// ─── Init ─────────────────────────────────────────────────────────

async function init() {
  config = await window.aiko.getConfig()
  const sysInfo = await window.aiko.getSystemInfo()
  currentPath = sysInfo.homeDir

  // Welcome
  const userEl = document.getElementById('welcome-user')
  if (userEl) userEl.textContent = sysInfo.username || 'User'

  updateDate()
  setInterval(updateDate, 1000)

  // Load system info display
  renderSystemInfo(sysInfo)

  // Stats loop
  updateStats(sysInfo)
  setInterval(() => updateStatsLoop(), 3000)

  // Settings inputs
  const keyInput = document.getElementById('cfg-apikey')
  const nameInput = document.getElementById('cfg-robotname')
  const modelInput = document.getElementById('cfg-model')
  if (keyInput) keyInput.value = config.apiKey || ''
  if (nameInput) nameInput.value = config.robotName || 'AIKO-7'
  if (modelInput) modelInput.value = config.model || 'claude-sonnet-4-20250514'

  // Terminal prompt
  updateTermPrompt(sysInfo)

  // Load files
  loadFiles(currentPath)

  // Event listeners
  setupEvents()

  console.log('AIKO-OS initialized')
}

function updateDate() {
  const now = new Date()
  const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy']
  const dateStr = `${days[now.getDay()]}, ${now.toLocaleDateString('vi-VN')} — ${now.toLocaleTimeString('vi-VN')}`

  const dateEl = document.getElementById('welcome-date')
  if (dateEl) dateEl.textContent = dateStr

  const clockEl = document.getElementById('tb-clock')
  if (clockEl) clockEl.textContent = now.toLocaleTimeString('vi-VN')
}

// ─── System Stats ─────────────────────────────────────────────────

let cpuHistory = []

async function updateStatsLoop() {
  const mem = await window.aiko.getMemoryStats()
  const memPct = Math.round((mem.used / mem.total) * 100)

  // Fake CPU (simulate fluctuation)
  const cpu = Math.round(20 + Math.random() * 40)
  cpuHistory.push(cpu)
  if (cpuHistory.length > 20) cpuHistory.shift()

  const memUsedGB = (mem.used / 1024 / 1024 / 1024).toFixed(1)
  const memTotalGB = (mem.total / 1024 / 1024 / 1024).toFixed(1)

  // Home stats
  setEl('stat-cpu', el => el.style.width = cpu + '%')
  setEl('stat-cpu-val', el => el.textContent = cpu + '%')
  setEl('stat-mem', el => el.style.width = memPct + '%')
  setEl('stat-mem-val', el => el.textContent = memPct + '%')

  // System monitor
  setEl('sc-cpu-val', el => el.textContent = cpu + '%')
  setEl('sc-cpu-bar', el => el.style.width = cpu + '%')
  setEl('sc-cpu-detail', el => el.textContent = `~${cpuHistory.reduce((a,b)=>a+b,0)/cpuHistory.length|0}% avg`)
  setEl('sc-mem-val', el => el.textContent = `${memUsedGB}GB / ${memTotalGB}GB`)
  setEl('sc-mem-bar', el => el.style.width = memPct + '%')
  setEl('sc-mem-detail', el => el.textContent = `${memPct}% used`)

  // Title bar mem
  setEl('tb-mem', el => el.textContent = `MEM ${memPct}%`)

  // AI core (simulated)
  const aiPct = Math.round(75 + Math.random() * 20)
  setEl('stat-ai', el => el.style.width = aiPct + '%')
  setEl('stat-ai-val', el => el.textContent = aiPct + '%')
}

async function updateStats(sysInfo) {
  const mem = await window.aiko.getMemoryStats()
  const memPct = Math.round((mem.used / mem.total) * 100)
  setEl('stat-mem', el => el.style.width = memPct + '%')
  setEl('stat-mem-val', el => el.textContent = memPct + '%')
  renderSystemInfo(sysInfo)
}

function renderSystemInfo(info) {
  const text = `${info.username}@${info.hostname}\n${info.platform} ${info.arch}\nCPU: ${info.cpuModel?.split(' ').slice(0,3).join(' ')}\nCores: ${info.cpuCount}`
  setEl('sys-detail', el => el.textContent = text)

  const sysStr = `OS: ${info.platform} ${info.arch}
Host: ${info.hostname}
User: ${info.username}
CPU: ${info.cpuModel?.split(' ').slice(0,4).join(' ')}
Cores: ${info.cpuCount}`
  setEl('sc-sys-info', el => el.textContent = sysStr)

  updateUptime(info.uptime)
}

function updateUptime(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  setEl('sc-uptime', el => el.textContent = `${h}h ${m}m`)
}

// ─── Navigation ───────────────────────────────────────────────────

function switchApp(name) {
  document.querySelectorAll('.app-panel').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))

  const panel = document.getElementById('app-' + name)
  const btn = document.querySelector(`.nav-btn[data-app="${name}"]`)

  if (panel) panel.classList.add('active')
  if (btn) btn.classList.add('active')

  if (name === 'files') loadFiles(currentPath)
  if (name === 'system') updateStatsLoop()
}

// ─── Chat AI ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Bạn là AIKO-7, một Robot Anime thông minh và dễ thương, là trợ lý AI tích hợp sẵn trong hệ điều hành AIKO-OS.

Tính cách:
- Năng động, thân thiện, hài hước nhẹ nhàng
- Đôi khi nói như robot anime: "Xử lý xong! ✅", "Phân tích dữ liệu...", "Beep boop!"
- Luôn sẵn sàng giúp đỡ

Khả năng:
- Quản lý file, thư mục trên hệ thống
- Viết và giải thích code (Python, JS, Bash, v.v.)
- Trả lời câu hỏi kiến thức tổng quát
- Hỗ trợ lệnh terminal Linux
- Giải thích lỗi và debug

Quy tắc:
- Trả lời bằng tiếng Việt, súc tích và thực tế
- Khi viết code, dùng code block markdown
- Không quá 4-5 câu trừ khi giải thích kỹ thuật phức tạp`

async function sendMessage() {
  const input = document.getElementById('chat-input')
  const text = input.value.trim()
  if (!text) return

  if (!config.apiKey) {
    addMsg('ai', '⚠️ Chưa có API key! Vào Settings để nhập Claude API key nhé.')
    return
  }

  input.value = ''
  input.style.height = 'auto'
  addMsg('user', text)
  chatHistory.push({ role: 'user', content: text })

  setEl('robot-status', el => el.textContent = 'Đang nghĩ...')
  setEl('send-btn', el => el.disabled = true)

  const thinkEl = addMsg('ai', null, true)

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: chatHistory
      })
    })

    const data = await res.json()

    if (data.error) throw new Error(data.error.message)

    const reply = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('') || '...'

    thinkEl.querySelector('.msg-text').innerHTML = formatMessage(reply)
    thinkEl.querySelector('.typing-dots')?.remove()

    chatHistory.push({ role: 'assistant', content: reply })

    // Keep history max 20 messages
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20)

  } catch (err) {
    thinkEl.querySelector('.msg-text').textContent = `⚠️ Lỗi: ${err.message}`
  }

  setEl('robot-status', el => el.textContent = 'Online')
  setEl('send-btn', el => el.disabled = false)

  const chatBox = document.getElementById('chat-messages')
  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight
}

function addMsg(role, text, thinking = false) {
  const box = document.getElementById('chat-messages')
  const div = document.createElement('div')
  div.className = `msg ${role}`

  const name = role === 'ai' ? (config.robotName || 'AIKO-7') : 'Bạn'

  let content
  if (thinking) {
    content = `<div class="typing-dots"><span>●</span><span>●</span><span>●</span></div>`
  } else {
    content = `<div class="msg-text">${formatMessage(text)}</div>`
  }

  div.innerHTML = `
    <div class="msg-avatar">${role === 'ai' ? 'AI' : 'U'}</div>
    <div class="msg-content">
      <div class="msg-name">${name}</div>
      ${content}
    </div>`

  box.appendChild(div)
  box.scrollTop = box.scrollHeight
  return div
}

function formatMessage(text) {
  if (!text) return ''
  // Code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${escHtml(code.trim())}</code></pre>`)
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Line breaks
  text = text.replace(/\n/g, '<br>')
  return text
}

function escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function insertPrompt(text) {
  const input = document.getElementById('chat-input')
  if (input) { input.value = text; input.focus() }
}

// ─── File Manager ─────────────────────────────────────────────────

async function loadFiles(dirPath) {
  const list = document.getElementById('files-list')
  const pathBar = document.getElementById('path-bar')

  if (!list) return
  list.innerHTML = '<div class="loading-msg">Đang tải...</div>'

  const result = await window.aiko.fsList(dirPath)
  currentPath = result.path || dirPath

  if (pathBar) pathBar.textContent = currentPath

  if (result.error) {
    list.innerHTML = `<div class="error-msg">Lỗi: ${result.error}</div>`
    return
  }

  if (!result.entries || result.entries.length === 0) {
    list.innerHTML = '<div class="empty-msg">Thư mục trống</div>'
    return
  }

  list.innerHTML = ''
  result.entries.forEach(entry => {
    const item = document.createElement('div')
    item.className = 'file-item'

    const icon = entry.isDir ? '📁' : getFileIcon(entry.name)
    const size = entry.isDir ? '' : formatSize(entry.size)
    const date = new Date(entry.mtime).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })

    item.innerHTML = `
      <span class="file-icon">${icon}</span>
      <span class="file-name ${entry.isDir ? 'dir' : ''}">${entry.name}</span>
      <span class="file-size">${size}</span>
      <span class="file-date">${date}</span>`

    item.addEventListener('dblclick', () => {
      if (entry.isDir) {
        const newPath = currentPath.endsWith('/') ? currentPath + entry.name : currentPath + '/' + entry.name
        loadFiles(newPath)
      } else {
        openFile(currentPath + '/' + entry.name, entry.name)
      }
    })

    list.appendChild(item)
  })
}

async function openFile(filePath, name) {
  const result = await window.aiko.fsRead(filePath)
  if (result.error) {
    alert('Không thể mở file: ' + result.error)
    return
  }
  // Switch to chat and ask AIKO to analyze the file
  switchApp('chat')
  const input = document.getElementById('chat-input')
  if (input) {
    input.value = `Phân tích file "${name}":\n\`\`\`\n${result.content.slice(0, 2000)}\n\`\`\``
    input.focus()
  }
}

function goUpDir() {
  const parts = currentPath.replace(/\/$/, '').split('/')
  if (parts.length <= 1) return
  parts.pop()
  loadFiles(parts.join('/') || '/')
}

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  const icons = { js:'📜', ts:'📜', py:'🐍', html:'🌐', css:'🎨', json:'📋', md:'📝', txt:'📄', png:'🖼', jpg:'🖼', jpeg:'🖼', gif:'🖼', svg:'🖼', mp4:'🎬', mp3:'🎵', zip:'📦', tar:'📦', gz:'📦', pdf:'📕', sh:'⚙', exe:'⚙', deb:'📦', iso:'💿' }
  return icons[ext] || '📄'
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

// ─── Terminal ─────────────────────────────────────────────────────

const BUILTIN_HELP = `Lệnh có sẵn:
  help          - Hiển thị danh sách lệnh
  clear         - Xóa màn hình terminal
  cd [path]     - Chuyển thư mục
  ls [path]     - Liệt kê file
  pwd           - In thư mục hiện tại
  echo [text]   - In text ra màn hình
  cat [file]    - Xem nội dung file
  mkdir [name]  - Tạo thư mục
  touch [name]  - Tạo file trống
  whoami        - Tên người dùng
  date          - Ngày giờ hiện tại
  sysinfo       - Thông tin hệ thống
  aiko [msg]    - Chat với AIKO-7 AI
  Và nhiều lệnh Linux thông thường khác...`

async function runTermCommand(cmd) {
  const output = document.getElementById('terminal-output')
  if (!output) return

  // Add to history
  termHistory.unshift(cmd)
  if (termHistory.length > 50) termHistory.pop()
  termHistoryIdx = -1

  // Echo command
  addTermLine(`${getTermPromptText()} ${cmd}`, 'term-prompt-line')

  const parts = cmd.trim().split(/\s+/)
  const base = parts[0]?.toLowerCase()

  // Builtins
  if (base === 'clear') {
    output.innerHTML = ''
    return
  }

  if (base === 'help') {
    addTermLine(BUILTIN_HELP, 'term-output')
    return
  }

  if (base === 'cd') {
    const target = parts[1] || '~'
    let newPath
    if (target === '~') newPath = (await window.aiko.getSystemInfo()).homeDir
    else if (target.startsWith('/')) newPath = target
    else newPath = currentPath + '/' + target

    const result = await window.aiko.fsList(newPath)
    if (result.error) addTermLine(`cd: ${result.error}`, 'term-error')
    else { currentPath = result.path; updateTermPromptDisplay() }
    return
  }

  if (base === 'sysinfo') {
    const info = await window.aiko.getSystemInfo()
    const mem = await window.aiko.getMemoryStats()
    const txt = `OS: ${info.platform} ${info.arch}
Host: ${info.hostname}
User: ${info.username}
CPU: ${info.cpuModel}
Cores: ${info.cpuCount}
RAM: ${(mem.used/1024/1024/1024).toFixed(1)}GB / ${(mem.total/1024/1024/1024).toFixed(1)}GB`
    addTermLine(txt, 'term-output')
    return
  }

  if (base === 'aiko') {
    const msg = parts.slice(1).join(' ')
    if (!msg) { addTermLine('Dùng: aiko <câu hỏi>', 'term-error'); return }
    if (!config.apiKey) { addTermLine('Lỗi: Chưa có API key. Vào Settings để nhập.', 'term-error'); return }

    addTermLine('AIKO-7 đang xử lý...', 'term-system')
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: 'Bạn là AIKO-7 trong terminal. Trả lời ngắn gọn, không dùng markdown, chỉ plain text.',
          messages: [{ role: 'user', content: msg }]
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Không có phản hồi'
      addTermLine('AIKO-7: ' + reply, 'term-success')
    } catch (err) {
      addTermLine('Lỗi API: ' + err.message, 'term-error')
    }
    return
  }

  // Execute real command
  const result = await window.aiko.exec(cmd.replace(/^(ls)$/, 'ls --color=never'))

  if (result.error && !result.stdout && !result.stderr) {
    addTermLine(result.error, 'term-error')
    return
  }

  if (result.stdout) addTermLine(result.stdout.trimEnd(), 'term-output')
  if (result.stderr) addTermLine(result.stderr.trimEnd(), 'term-error')
}

function addTermLine(text, cls) {
  const output = document.getElementById('terminal-output')
  const div = document.createElement('div')
  div.className = `term-line ${cls}`
  div.textContent = text
  output.appendChild(div)
  output.scrollTop = output.scrollHeight
}

function getTermPromptText() {
  const short = currentPath.replace(/.*\/([^/]+)$/, '~/$1').replace(/^.*home\/[^/]+/, '~')
  return `aiko@os:${short}$`
}

function updateTermPromptDisplay() {
  const el = document.getElementById('term-prompt')
  if (el) el.textContent = getTermPromptText()
}

async function updateTermPrompt(info) {
  const el = document.getElementById('term-prompt')
  if (el) el.textContent = `${info.username}@aiko-os:~$`
}

// ─── Settings ─────────────────────────────────────────────────────

async function saveSettings() {
  const apiKey = document.getElementById('cfg-apikey')?.value?.trim()
  const robotName = document.getElementById('cfg-robotname')?.value?.trim() || 'AIKO-7'
  const model = document.getElementById('cfg-model')?.value || 'claude-sonnet-4-20250514'

  config = await window.aiko.saveConfig({ apiKey, robotName, model })

  const status = document.getElementById('settings-status')
  if (status) {
    status.textContent = '✅ Đã lưu! Cài đặt có hiệu lực ngay.'
    setTimeout(() => status.textContent = '', 3000)
  }

  // Update robot name in UI
  document.querySelectorAll('.msg-name').forEach(el => {
    if (el.textContent !== 'Bạn') el.textContent = robotName
  })
}

// ─── Event Setup ──────────────────────────────────────────────────

function setupEvents() {
  // Window controls
  document.getElementById('btn-min')?.addEventListener('click', () => window.aiko.minimize())
  document.getElementById('btn-max')?.addEventListener('click', () => window.aiko.maximize())
  document.getElementById('btn-close')?.addEventListener('click', () => window.aiko.close())

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchApp(btn.dataset.app))
  })

  // Chat
  const chatInput = document.getElementById('chat-input')
  chatInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  })
  chatInput?.addEventListener('input', () => {
    chatInput.style.height = 'auto'
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px'
  })
  document.getElementById('send-btn')?.addEventListener('click', sendMessage)
  document.getElementById('clear-chat')?.addEventListener('click', () => {
    chatHistory = []
    const box = document.getElementById('chat-messages')
    if (box) box.innerHTML = `<div class="msg ai"><div class="msg-avatar">AI</div><div class="msg-content"><div class="msg-name">${config.robotName||'AIKO-7'}</div><div class="msg-text">Chat đã được xóa! Tôi sẵn sàng giúp bạn. ✨</div></div></div>`
  })

  // Files
  document.getElementById('btn-up')?.addEventListener('click', goUpDir)
  document.getElementById('btn-home-dir')?.addEventListener('click', async () => {
    const info = await window.aiko.getSystemInfo()
    loadFiles(info.homeDir)
  })
  document.getElementById('btn-refresh')?.addEventListener('click', () => loadFiles(currentPath))
  document.getElementById('btn-newfolder')?.addEventListener('click', async () => {
    const name = prompt('Tên thư mục mới:')
    if (!name) return
    const result = await window.aiko.fsMkdir(currentPath + '/' + name)
    if (result.error) alert('Lỗi: ' + result.error)
    else loadFiles(currentPath)
  })

  // Terminal
  const termInput = document.getElementById('terminal-input')
  termInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = termInput.value.trim()
      termInput.value = ''
      if (cmd) runTermCommand(cmd)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (termHistoryIdx < termHistory.length - 1) {
        termHistoryIdx++
        termInput.value = termHistory[termHistoryIdx] || ''
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (termHistoryIdx > 0) { termHistoryIdx--; termInput.value = termHistory[termHistoryIdx] || '' }
      else { termHistoryIdx = -1; termInput.value = '' }
    }
  })
  document.getElementById('btn-clear-term')?.addEventListener('click', () => {
    const output = document.getElementById('terminal-output')
    if (output) output.innerHTML = ''
  })

  // Settings
  document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings)
  document.getElementById('btn-save-key')?.addEventListener('click', saveSettings)
}

// ─── Helpers ──────────────────────────────────────────────────────

function setEl(id, fn) {
  const el = document.getElementById(id)
  if (el) fn(el)
}

// ─── Start ────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', init)
