/* =====================================================================
   05b_ui_ai.js  -  Typed/spoken replies, AI boss conversation, AI settings.
   ===================================================================== */

Object.assign(UI, {
  /* enable/disable the text box depending on the call state */
  updateCallOpts() {
    const call = CallSystem.active;
    const live = !!call && !call.over && CallSystem.state === 'active';
    const disabled = this.busy || !live || !!(call && call.thinking);
    const t = $('cp-text'), was = t.disabled;
    t.disabled = disabled; $('cp-send').disabled = disabled; $('cp-mic').disabled = disabled || !Speech.supported();
    $('cp-end').disabled = !live;
    if (was && !disabled && t.focus) t.focus();
    let hint = LLM.enabled() ? (LLM.online === false ? 'AI: offline mode (simple replies)' : 'AI: local model') : 'AI: off (simple replies)';
    if (live && Equip.has('analyzer')) hint += '   |   Sale odds: ' + Math.round(DialogueSystem.successChance(call) * 100) + '%';
    $('cp-hint').textContent = hint;
  },

  sendTyped() {
    if (CallSystem.state !== 'active') return;
    const t = $('cp-text'), v = String(t.value || '').trim(); if (!v) return;
    t.value = ''; AudioManager.play('ui'); CallSystem.submitText(v);
  },

  /* ----- boss conversation ----- */
  renderBossChat() {
    const ch = BossSystem.chat; if (!ch) return;
    $('bc-log').innerHTML = ch.history.map(e => '<div class="' + (e.who === 'boss' ? 'caller' : 'you') + '"><b>' + (e.who === 'boss' ? 'BOSS' : 'YOU') + '</b>' + this.esc(e.text) + '</div>').join('') + (ch.busy ? '<div class="sys">...</div>' : '');
    const done = ch.turns >= 2;
    $('bc-text').disabled = ch.busy || done; $('bc-send').disabled = ch.busy || done; $('bc-mic').disabled = ch.busy || done || !Speech.supported();
    $('bc-skip').textContent = done ? 'Back to work' : 'Say nothing';
    if (!ch.busy && !done && $('bc-text').focus) $('bc-text').focus();
    $('bc-log').scrollTop = 99999;
  },
  sendBoss() {
    const t = $('bc-text'), v = String(t.value || '').trim(); if (!v) return;
    t.value = ''; AudioManager.play('ui'); BossSystem.reply(v);
  },

  /* ----- settings screen ----- */
  fillAISettings() {
    const d = AISettings.d;
    $('ai-on').checked = !!d.enabled; $('ai-endpoint').value = d.endpoint; $('ai-model').value = d.model; $('ai-lang').value = d.lang; $('ai-voice').checked = !!d.voice;
    $('ai-status').textContent = '';
  },
  readAISettings() {
    const d = AISettings.d;
    d.enabled = !!$('ai-on').checked; d.endpoint = String($('ai-endpoint').value || '').trim() || 'http://localhost:11434';
    d.model = String($('ai-model').value || '').trim() || 'llama3.2:3b'; d.lang = $('ai-lang').value || 'English'; d.voice = !!$('ai-voice').checked;
    LLM.warned = false; LLM.online = null; LLM.warm = false;
    AISettings.save();
  },

  initAI() {
    // call input
    $('cp-send').addEventListener('click', () => this.sendTyped());
    $('cp-text').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendTyped(); } });
    $('cp-end').addEventListener('click', () => { if (CallSystem.state === 'active') { AudioManager.play('ui'); CallSystem.choose('end'); } });
    $('cp-mic').addEventListener('click', () => {
      if (Speech.listening) { Speech.stop(); return; }
      Speech.listen(txt => { $('cp-text').value = txt; this.sendTyped(); }, on => { $('cp-mic').textContent = on ? 'Listening...' : 'Mic'; $('cp-mic').classList.toggle('on', on); });
    });
    if (!Speech.supported()) $('cp-mic').title = 'Speech input needs Chrome or Edge';
    Bus.on('call:thinking', on => {
      const old = $('cp-think'); if (old && old.remove) old.remove();
      if (on) { const d = document.createElement('div'); d.id = 'cp-think'; d.className = 'sys'; d.textContent = '...'; $('cp-log').appendChild(d); $('cp-log').scrollTop = 99999; }
      this.updateCallOpts();
    });
    Bus.on('ai:status', () => { if (CallSystem.active) this.updateCallOpts(); });
    Bus.on('ai:error', msg => {
      if (CallSystem.state !== 'active') return;
      const d = document.createElement('div'); d.className = 'warn'; d.style.fontSize = '12px'; d.textContent = 'AI problem: ' + msg; $('cp-log').appendChild(d); $('cp-log').scrollTop = 99999;
    });

    // boss chat
    Bus.on('boss:chat', () => { if (!$('bosschat').classList.contains('show')) { this.show('bosschat'); Speech.speak(BossSystem.chat.history[0].text, 'boss'); } this.renderBossChat(); });
    Bus.on('boss:said', t => Speech.speak(t, 'boss'));
    Bus.on('boss:chatclosed', () => { this.hide('bosschat'); Game.relock(); });
    $('bc-send').addEventListener('click', () => this.sendBoss());
    $('bc-text').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendBoss(); } });
    $('bc-skip').addEventListener('click', () => BossSystem.closeChat());
    $('bc-mic').addEventListener('click', () => {
      if (Speech.listening) { Speech.stop(); return; }
      Speech.listen(txt => { $('bc-text').value = txt; this.sendBoss(); }, on => { $('bc-mic').textContent = on ? 'Listening...' : 'Mic'; });
    });

    // settings
    $('b-ai').addEventListener('click', () => { AudioManager.play('ui'); this.fillAISettings(); $('menu').classList.remove('show'); this.show('aiset'); });
    $('ai-save').addEventListener('click', () => { this.readAISettings(); this.hide('aiset'); $('menu').classList.add('show'); });
    $('ai-test').addEventListener('click', async () => {
      this.readAISettings(); $('ai-status').textContent = 'Testing...'; $('ai-status').className = 'small';
      const r = await LLM.test(); $('ai-status').textContent = r.msg; $('ai-status').className = 'small ' + (r.ok ? 'good' : 'bad');
    });
  },
});

/* wrap two existing UI methods instead of editing them */
(function () {
  const begin = UI.beginCall, add = UI.addLine, end = UI.endCallUI;
  UI.beginCall = function (call) { begin.call(this, call); $('cp-text').value = ''; this.updateCallOpts(); };
  UI.addLine = function (e) {
    add.call(this, e);
    if (e.who === 'caller' && CallSystem.active) { const c = CallSystem.active.caller; Speech.speak(e.text, c.arch.g === 'f' ? 'f' : 'm', c.age); }
  };
  UI.endCallUI = function () { end.call(this); Speech.stop(); };
})();
