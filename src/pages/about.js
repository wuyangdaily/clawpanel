/**
 * 关于页面
 * 版本信息、项目链接、相关项目、系统环境
 */
import { api } from '../lib/tauri-api.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">关于</h1>
      <p class="page-desc">ClawPanel — OpenClaw 可视化管理面板</p>
    </div>
    <div class="stat-cards" id="version-cards">
      <div class="stat-card loading-placeholder"></div>
      <div class="stat-card loading-placeholder"></div>
      <div class="stat-card loading-placeholder"></div>
    </div>
    <div class="config-section">
      <div class="config-section-title">相关项目</div>
      <div id="projects-list"></div>
    </div>
    <div class="config-section">
      <div class="config-section-title">快捷链接</div>
      <div id="links-list"></div>
    </div>
    <div class="config-section" style="color:var(--text-tertiary);font-size:var(--font-size-xs)">
      <p>ClawPanel 基于 Tauri v2 构建，前端 Vanilla JS + Vite，后端 Rust。</p>
      <p style="margin-top:8px">MIT License &copy; 2026 qingchencloud</p>
    </div>
  `

  loadData(page)
  renderProjects(page)
  renderLinks(page)
  return page
}

async function loadData(page) {
  const cards = page.querySelector('#version-cards')
  try {
    const [version, install] = await Promise.all([
      api.getVersionInfo(),
      api.checkInstallation(),
    ])
    cards.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header"><span class="stat-card-label">ClawPanel</span></div>
        <div class="stat-card-value">0.1.0</div>
        <div class="stat-card-meta">Tauri v2 桌面应用</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header"><span class="stat-card-label">OpenClaw</span></div>
        <div class="stat-card-value">${version.current || '未知'}</div>
        <div class="stat-card-meta">${version.update_available ? '有新版本可用' : '已是最新'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header"><span class="stat-card-label">安装路径</span></div>
        <div class="stat-card-value" style="font-size:var(--font-size-sm);word-break:break-all">${install.path || '未知'}</div>
        <div class="stat-card-meta">${install.installed ? '已安装' : '未安装'}</div>
      </div>
    `
  } catch {
    cards.innerHTML = '<div class="stat-card"><div class="stat-card-label">加载失败</div></div>'
  }
}

const PROJECTS = [
  {
    name: 'OpenClaw',
    desc: 'AI Agent 框架，支持多模型协作、工具调用、记忆管理',
    url: 'https://github.com/openclaw-labs/openclaw',
  },
  {
    name: 'ClawApp',
    desc: '跨平台移动聊天客户端，H5 + 代理服务器架构，支持离线和流式传输',
    url: 'https://github.com/qingchencloud/clawapp',
  },
  {
    name: 'cftunnel',
    desc: '全协议内网穿透工具，Cloud 模式免费 HTTP/WS + Relay 模式自建中继',
    url: 'https://github.com/qingchencloud/cftunnel',
  },
  {
    name: 'ClawPanel',
    desc: 'OpenClaw 可视化管理面板，Tauri v2 桌面应用',
    url: 'https://github.com/qingchencloud/clawpanel',
  },
]

function renderProjects(page) {
  const el = page.querySelector('#projects-list')
  el.innerHTML = PROJECTS.map(p => `
    <div class="service-card">
      <div class="service-info">
        <div>
          <div class="service-name">${p.name}</div>
          <div class="service-desc">${p.desc}</div>
        </div>
      </div>
      <div class="service-actions">
        <a class="btn btn-secondary btn-sm" href="${p.url}" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
  `).join('')
}

const LINKS = [
  { label: 'cftunnel 官网', url: 'https://cftunnel.qt.cool' },
  { label: 'cftunnel 桌面客户端', url: 'https://github.com/qingchencloud/cftunnel-app/releases' },
  { label: 'OpenClaw 中文翻译', url: 'https://github.com/1186258278/OpenClawChineseTranslation' },
  { label: 'ClawApp 文档', url: 'https://github.com/qingchencloud/clawapp#readme' },
]

function renderLinks(page) {
  const el = page.querySelector('#links-list')
  el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:var(--space-sm)">
    ${LINKS.map(l => `<a class="btn btn-secondary btn-sm" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('')}
  </div>`
}
