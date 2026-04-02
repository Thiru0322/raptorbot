/**
 * Raptor Bot Widget — embed on any website
 * Auto-generated. Do not edit manually.
 * Usage: See /dashboard/deploy for your personal snippet.
 */
;(function (w, d) {
  'use strict'

  var API_BASE = '__RAPTOR_API_BASE__'

  function RaptorBot(config) {
    this.botId = config.botId
    this.position = config.position || 'bottom-right'
    this.primaryColor = config.primaryColor || '#7c6af5'
    this.sessionId = config.sessionId || ('sess_' + Math.random().toString(36).slice(2))
    this.userContext = config.userContext || {}
    this.messages = []
    this.open = false
    this._init()
  }

  RaptorBot.prototype._init = function () {
    this._injectStyles()
    this._buildWidget()
    this._fetchConfig()
  }

  RaptorBot.prototype._injectStyles = function () {
    if (d.getElementById('raptor-styles')) return
    var s = d.createElement('style')
    s.id = 'raptor-styles'
    var c = this.primaryColor
    s.textContent = [
      '#raptor-widget *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '#raptor-toggle{position:fixed;width:52px;height:52px;border-radius:50%;background:' + c + ';border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 20px ' + c + '66;',
      'transition:transform .2s,box-shadow .2s;z-index:2147483646}',
      '#raptor-toggle:hover{transform:scale(1.08);box-shadow:0 6px 28px ' + c + '88}',
      '#raptor-panel{position:fixed;width:360px;height:520px;background:#111;border:1px solid #2a2a2a;',
      'border-radius:16px;display:flex;flex-direction:column;z-index:2147483645;',
      'box-shadow:0 20px 60px #00000088;transition:opacity .2s,transform .2s}',
      '#raptor-panel.hidden{opacity:0;pointer-events:none;transform:translateY(12px)}',
      '#raptor-header{padding:14px 16px;border-bottom:1px solid #1e1e1e;display:flex;align-items:center;gap:10px;flex-shrink:0}',
      '#raptor-avatar{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}',
      '#raptor-name{font-size:14px;font-weight:600;color:#f0ede8}',
      '#raptor-status{font-size:11px;color:#4ade80}',
      '#raptor-close{margin-left:auto;background:transparent;border:none;color:#666;cursor:pointer;font-size:18px;line-height:1;padding:2px}',
      '#raptor-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
      '#raptor-messages::-webkit-scrollbar{width:3px}',
      '#raptor-messages::-webkit-scrollbar-thumb{background:#333;border-radius:2px}',
      '.raptor-msg{max-width:80%;padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.55;word-break:break-word;white-space:pre-wrap}',
      '.raptor-msg.user{align-self:flex-end;border-bottom-right-radius:2px}',
      '.raptor-msg.bot{align-self:flex-start;background:#1e1e2e;color:#e0ddf5;border-bottom-left-radius:2px}',
      '.raptor-typing{display:flex;gap:4px;padding:10px 14px;background:#1e1e2e;border-radius:12px;border-bottom-left-radius:2px;align-self:flex-start}',
      '.raptor-dot{width:6px;height:6px;border-radius:50%;background:#555;animation:rdot 1s infinite}',
      '.raptor-dot:nth-child(2){animation-delay:.2s}',
      '.raptor-dot:nth-child(3){animation-delay:.4s}',
      '@keyframes rdot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}',
      '#raptor-footer{padding:10px 12px;border-top:1px solid #1e1e1e;display:flex;gap:8px;flex-shrink:0}',
      '#raptor-input{flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:9px 13px;',
      'color:#f0ede8;font-size:13px;outline:none;resize:none;line-height:1.4}',
      '#raptor-input:focus{border-color:' + c + '66}',
      '#raptor-send{width:36px;height:36px;border-radius:8px;background:' + c + ';border:none;cursor:pointer;',
      'color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;',
      'transition:opacity .15s;align-self:flex-end}',
      '#raptor-send:disabled{opacity:.4;cursor:default}',
      '#raptor-branding{text-align:center;font-size:10px;color:#333;padding:4px 0 2px}',
      '#raptor-branding a{color:#555;text-decoration:none}',
    ].join('')
    d.head.appendChild(s)
  }

  RaptorBot.prototype._buildWidget = function () {
    var self = this
    var isRight = this.position.includes('right')
    var isBottom = this.position.includes('bottom')
    var posStyles = (isBottom ? 'bottom:20px;' : 'top:20px;') + (isRight ? 'right:20px;' : 'left:20px;')

    // Toggle button
    var toggle = d.createElement('button')
    toggle.id = 'raptor-toggle'
    toggle.style.cssText = posStyles
    toggle.innerHTML = '🦖'
    toggle.setAttribute('aria-label', 'Open chat')
    toggle.onclick = function () { self._togglePanel() }

    // Panel
    var panel = d.createElement('div')
    panel.id = 'raptor-panel'
    var panelPos = (isBottom ? 'bottom:82px;' : 'top:82px;') + (isRight ? 'right:20px;' : 'left:20px;')
    panel.style.cssText = panelPos
    panel.className = 'hidden'
    panel.innerHTML = [
      '<div id="raptor-header">',
      '  <div id="raptor-avatar" style="background:' + this.primaryColor + '22;border:1px solid ' + this.primaryColor + '44">🦖</div>',
      '  <div><div id="raptor-name">Assistant</div><div id="raptor-status">● Online</div></div>',
      '  <button id="raptor-close" onclick="document.getElementById(\'raptor-panel\').classList.add(\'hidden\')">✕</button>',
      '</div>',
      '<div id="raptor-messages"></div>',
      '<div id="raptor-footer">',
      '  <textarea id="raptor-input" rows="1" placeholder="Type a message…"></textarea>',
      '  <button id="raptor-send" disabled>↑</button>',
      '</div>',
      '<div id="raptor-branding">Powered by <a href="https://raptorbot.ai" target="_blank">Raptor Bot</a></div>',
    ].join('')

    var wrap = d.createElement('div')
    wrap.id = 'raptor-widget'
    wrap.appendChild(toggle)
    wrap.appendChild(panel)
    d.body.appendChild(wrap)

    // Input handlers
    var input = d.getElementById('raptor-input')
    var sendBtn = d.getElementById('raptor-send')
    input.oninput = function () {
      sendBtn.disabled = !input.value.trim()
      input.style.height = 'auto'
      input.style.height = Math.min(input.scrollHeight, 96) + 'px'
    }
    input.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._send() }
    }
    sendBtn.onclick = function () { self._send() }
  }

  RaptorBot.prototype._fetchConfig = function () {
    var self = this
    fetch(API_BASE + '/api/widget/' + this.botId + '/config')
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (data) {
        if (!data) return
        var nameEl = d.getElementById('raptor-name')
        var avatarEl = d.getElementById('raptor-avatar')
        if (nameEl) nameEl.textContent = data.name || 'Assistant'
        if (avatarEl) avatarEl.textContent = data.avatar || '🦖'
        self._addBotMessage(data.welcome_message || 'Hi! How can I help you?')
      })
      .catch(function () {
        self._addBotMessage('Hi! How can I help you today?')
      })
  }

  RaptorBot.prototype._togglePanel = function () {
    var panel = d.getElementById('raptor-panel')
    var toggle = d.getElementById('raptor-toggle')
    this.open = !this.open
    if (this.open) {
      panel.classList.remove('hidden')
      toggle.innerHTML = '✕'
      d.getElementById('raptor-input').focus()
    } else {
      panel.classList.add('hidden')
      toggle.innerHTML = '🦖'
    }
  }

  RaptorBot.prototype._addBotMessage = function (text) {
    var msgs = d.getElementById('raptor-messages')
    if (!msgs) return
    var div = d.createElement('div')
    div.className = 'raptor-msg bot animate-fade-in'
    div.textContent = text
    msgs.appendChild(div)
    msgs.scrollTop = msgs.scrollHeight
    return div
  }

  RaptorBot.prototype._addUserMessage = function (text) {
    var msgs = d.getElementById('raptor-messages')
    var div = d.createElement('div')
    div.className = 'raptor-msg user'
    div.style.background = this.primaryColor
    div.style.color = '#fff'
    div.textContent = text
    msgs.appendChild(div)
    msgs.scrollTop = msgs.scrollHeight
  }

  RaptorBot.prototype._showTyping = function () {
    var msgs = d.getElementById('raptor-messages')
    var el = d.createElement('div')
    el.className = 'raptor-typing'
    el.id = 'raptor-typing'
    el.innerHTML = '<div class="raptor-dot"></div><div class="raptor-dot"></div><div class="raptor-dot"></div>'
    msgs.appendChild(el)
    msgs.scrollTop = msgs.scrollHeight
  }

  RaptorBot.prototype._hideTyping = function () {
    var el = d.getElementById('raptor-typing')
    if (el) el.remove()
  }

  RaptorBot.prototype._send = function () {
    var input = d.getElementById('raptor-input')
    var text = input.value.trim()
    if (!text) return

    input.value = ''
    input.style.height = 'auto'
    d.getElementById('raptor-send').disabled = true

    this._addUserMessage(text)
    this.messages.push({ role: 'user', content: text })
    this._showTyping()

    var self = this
    var botDiv = null

    fetch(API_BASE + '/api/widget/' + this.botId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: this.messages,
        sessionId: this.sessionId,
        userContext: this.userContext,
      }),
    }).then(function (res) {
      if (!res.ok) throw new Error('Chat error')
      self._hideTyping()
      botDiv = self._addBotMessage('')
      var reader = res.body.getReader()
      var decoder = new TextDecoder()
      var full = ''

      function read() {
        reader.read().then(function (result) {
          if (result.done) {
            self.messages.push({ role: 'assistant', content: full })
            return
          }
          var lines = decoder.decode(result.value).split('\n')
          lines.forEach(function (line) {
            if (!line.startsWith('data: ')) return
            var data = line.slice(6)
            if (data === '[DONE]') return
            try {
              var parsed = JSON.parse(data)
              if (parsed.text) {
                full += parsed.text
                botDiv.textContent = full
                d.getElementById('raptor-messages').scrollTop = 999999
              }
            } catch (e) {}
          })
          read()
        })
      }
      read()
    }).catch(function (err) {
      self._hideTyping()
      self._addBotMessage('Sorry, something went wrong. Please try again.')
    })
  }

  // Public init
  w.RaptorBot = RaptorBot

  // Legacy snippet API: bf('init', config)
  var queue = w['bf'] && w['bf'].q ? w['bf'].q : []
  w['bf'] = function () {
    var args = Array.prototype.slice.call(arguments)
    if (args[0] === 'init') {
      new RaptorBot(args[1])
    }
  }
  queue.forEach(function (args) { w['bf'].apply(null, args) })

})(window, document)
