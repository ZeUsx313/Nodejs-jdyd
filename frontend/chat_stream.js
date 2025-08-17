function createStreamingMessage(sender = 'assistant') {
    const messageId = Date.now().toString();
    const messagesArea = document.getElementById('messagesArea');

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-bubble message-${sender} streaming-message`;
    messageDiv.id = `message-${messageId}`;

    messageDiv.innerHTML = `
        <div class="message-content" id="content-${messageId}">
            <span class="streaming-cursor"></span>
        </div>
        <div class="streaming-indicator">
            <i class="fas fa-robot text-xs"></i>
            <span>يكتب زيوس</span>
            <div class="streaming-dots">
                <div class="streaming-dot"></div>
                <div class="streaming-dot"></div>
                <div class="streaming-dot"></div>
            </div>
        </div>
    `;

    messagesArea.appendChild(messageDiv);
    scrollToBottom();

    streamingState.currentMessageId = messageId;
    streamingState.streamingElement = document.getElementById(`content-${messageId}`);
    streamingState.currentText = '';
    streamingState.isStreaming = true;
// ✨ الجديد: ثبت المحادثة التي بدأ فيها البث
    streamingState.chatId = currentChatId;

// زر الإرسال يتحول فوراً إلى "إيقاف"
    updateSendButton();

    return messageId;
}

function appendToStreamingMessage(text, isComplete = false) {
    if (!streamingState.isStreaming) return;

    // نجمع النص دائمًا
    streamingState.currentText += text;

    // إذا لم يكن لدينا عنصر DOM (مثلاً لأننا بدّلنا المحادثة)
    // ونعود الآن إلى نفس المحادثة التي يجري فيها البث،
    // نعيد إنشاء الفقاعة وربط العنصر مرة أخرى.
    if (!streamingState.streamingElement) {
        const weAreOnTheStreamingChat =
            currentChatId && streamingState.chatId && currentChatId === streamingState.chatId;

        if (weAreOnTheStreamingChat) {
            // إعادة إرفاق فقاعة البث في هذه المحادثة
            const messageId = streamingState.currentMessageId;
            const messagesArea = document.getElementById('messagesArea');

            // أنشئ غلاف الرسالة يدويًا (نسخة مبسطة من createStreamingMessage بدون إعادة ضبط الحالة)
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-bubble message-assistant streaming-message`;
            messageDiv.id = `message-${messageId}`;
            messageDiv.innerHTML = `
              <div class="message-content" id="content-${messageId}">
                  <span class="streaming-cursor"></span>
              </div>
              <div class="streaming-indicator">
                  <i class="fas fa-robot text-xs"></i>
                  <span>يكتب زيوس</span>
                  <div class="streaming-dots">
                      <div class="streaming-dot"></div>
                      <div class="streaming-dot"></div>
                      <div class="streaming-dot"></div>
                  </div>
              </div>
            `;
            messagesArea.appendChild(messageDiv);
            streamingState.streamingElement = document.getElementById(`content-${messageId}`);
        }
    }

    // إن لم يتوفر عنصر بعد (لأننا في محادثة أخرى)، نكتفي بتجميع النص ونؤجل العرض
    if (!streamingState.streamingElement) {
        if (isComplete) completeStreamingMessage();
        return;
    }

    // الآن نحدّث الـ DOM كالمعتاد
    const cursor = streamingState.streamingElement.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();
    const renderedContent = marked.parse(streamingState.currentText);
    streamingState.streamingElement.innerHTML = renderedContent;

    if (!isComplete) {
        const newCursor = document.createElement('span');
        newCursor.className = 'streaming-cursor';
        streamingState.streamingElement.appendChild(newCursor);
    }

    streamingState.streamingElement.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
        addCodeHeader(block.parentElement);
    });

    smoothScrollToBottom();

    if (isComplete) {
        completeStreamingMessage();
    }
}

// ===== دوالّ جديدة توضع فوق completeStreamingMessage() =====
// === [جديد] فتح خارجي موثوق حتى على iOS (يحل مشكلة عدم فتح الروابط) ===
function openExternal(url) {
  try {
    const w = window.open(url, '_blank', 'noopener'); // محاولة مباشرة
    if (w && typeof w.focus === 'function') w.focus();

    // احتياطي لو منع المتصفح window.open
    if (!w) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (_) {
    // آخر حل: افتح في نفس الصفحة
    location.href = url;
  }
}

// === [جديد] تحقّق بسيط: هل النص دومين؟ ===
function looksLikeDomain(text) {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test((text || '').trim());
}

// === [جديد/موسّع] فكّ الروابط الملتفّة (Google/Vertex/MSN/Reddit/LinkedIn/Twitter/Facebook...) ===
function unwrapUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname;

    const isWrapper =
      /vertexaisearch\.cloud\.google\.com$/.test(host) ||
      /news\.google\.com$/.test(host) ||
      /\.google\./.test(host) ||
      /^t\.co$/.test(host) ||
      /^lnkd\.in$/.test(host) ||
      /^l\.facebook\.com$/.test(host) ||
      /^lm\.facebook\.com$/.test(host) ||
      /^go\.microsoft\.com$/.test(host) ||
      /^r\.msn\.com$/.test(host) ||
      /^out\.reddit\.com$/.test(host);

    if (isWrapper) {
      const real =
        u.searchParams.get('url')   ||
        u.searchParams.get('u')     ||
        u.searchParams.get('q')     ||
        u.searchParams.get('target')||
        u.searchParams.get('to')    ||
        u.searchParams.get('dest')  || '';
      if (real) return new URL(real).toString();
    }
    return u.toString();
  } catch { return rawUrl; }
}

// === [جديد/موسّع] تحويل Markdown إلى روابط مرتّبة مع إزالة تكرار الدومين + Favicon صحيح ===
function parseMarkdownLinks(md) {
  const seen = new Set();
  const items = [];

  md.split('\n').forEach(line => {
    const l = line.trim();
    if (!l.startsWith('- [')) return;

    const m = l.match(/^\-\s+\[(.+?)\]\((https?:\/\/[^\s)]+)\)/);
    if (!m) return;

    const rawTitle = (m[1] || '').trim();
    const rawUrl   = m[2];

    const url = unwrapUrl(rawUrl);
    const domain = (looksLikeDomain(rawTitle) ? rawTitle : (new URL(url)).hostname)
      .replace(/^www\./,'')
      .toLowerCase();

    if (seen.has(domain)) return;    // إزالة التكرار مع الحفاظ على أول ظهور (أسلوب GPT)
    seen.add(domain);

    const title   = rawTitle || domain; // fallback للعنوان إذا كان فارغًا
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    items.push({ title, url, domain, favicon });
  });

  return items;
}

// === [جديد/محدّث] شريط الأيقونات أسفل الرسالة + زر "المصادر" ===
function createSourcesInlineBar(containerEl, links) {
  if (!links || links.length === 0) return;

  const preview = links.slice(0, 3); // بعد dedupe
  const wrapper = document.createElement('div');
  wrapper.className = 'sources-inline';

  const icons = document.createElement('div');
  icons.className = 'sources-icons';
  icons.innerHTML = preview.map(l => `
    <a class="source-icon" href="${l.url}" target="_blank" rel="noopener"
       onclick="event.preventDefault(); event.stopPropagation(); openExternal('${l.url.replace(/'/g, "\\'")}');">
      <img src="${l.favicon}" alt="${l.domain}" loading="lazy">
    </a>
  `).join('');
  wrapper.appendChild(icons);

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'sources-open-btn';
  openBtn.textContent = 'المصادر';
  openBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    openSourcesModal(links);
  });
  wrapper.appendChild(openBtn);

  containerEl.appendChild(wrapper);
}

// === [جديد/محدّث] نافذة "اقتباسات" بأسلوب GPT + RTL + فتح مضمون على iOS ===
function openSourcesModal(links) {
  // حافظ على ترتيب الظهور كما هو (بعد إزالة التكرار)
  const normalized = links.map(l => {
    const title = (l.title && l.title.trim()) || l.domain; // fallback أقوى
    return { ...l, title };
  });

  const modal = document.createElement('div');
  modal.className = 'gpt-modal-overlay';
  modal.innerHTML = `
    <div class="gpt-modal" dir="rtl">
      <div class="gpt-modal-top-pill"></div>
      <div class="gpt-modal-header">
        <div class="gpt-modal-title">اقتباسات</div>
        <button class="gpt-modal-close" aria-label="إغلاق">&times;</button>
      </div>
      <div class="gpt-modal-body">
        ${normalized.map(item => `
          <a class="gpt-source-item" href="${item.url}" target="_blank" rel="noopener"
             onclick="event.preventDefault(); openExternal('${item.url.replace(/'/g, "\\'")}');">
            <div class="gpt-source-title-line">
              <img class="gpt-favicon" src="${item.favicon}" alt="">
              <span class="gpt-source-title">${escapeHtml(((item.title && item.title.trim()) || item.domain))}</span>
            </div>
            <div class="gpt-source-subline">
              <span class="gpt-source-domain">${escapeHtml(item.domain)}</span>
              <span class="gpt-source-badge" aria-hidden="true"></span>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.gpt-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

// ====== بعد (نسخة جديدة بالكامل) ======
function completeStreamingMessage() {
  if (!streamingState.isStreaming) return;

  const messageElement = document.getElementById(`message-${streamingState.currentMessageId}`);
  if (messageElement) {
    // إزالة مؤشّر البث
    const indicator = messageElement.querySelector('.streaming-indicator');
    if (indicator) indicator.remove();
    messageElement.classList.remove('streaming-message');

    // فصل المتن عن قسم **🔍 المصادر:**
    const fullText = streamingState.currentText || '';
    const splitToken = '\n**🔍 المصادر:**\n';
    let mainText = fullText, sourcesMd = '';

    const idx = fullText.indexOf(splitToken);
    if (idx !== -1) {
      mainText  = fullText.slice(0, idx);
      sourcesMd = fullText.slice(idx + splitToken.length);
    }

    // عرض المتن فقط داخل الفقاعة
    const contentEl = messageElement.querySelector('.message-content');
    if (contentEl) {
      contentEl.innerHTML = marked.parse(mainText);
      contentEl.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
        addCodeHeader(block.parentElement);
      });
    }

    // أزرار (نسخ/إعادة توليد) تعمل على "المتن" فقط
    addMessageActions(messageElement, mainText);

    // ✅ شريط معاينة + نافذة كروت للمصادر (بدون زر إظهار/إخفاء القديم)
    if (sourcesMd.trim()) {
      const links = parseMarkdownLinks(sourcesMd); // يستخدم Regex Markdown القياسي
      if (links.length > 0) {
        createSourcesInlineBar(messageElement, links); // بطاقات صغيرة + زر "المصادر"
      }
    }
  }

  // حفظ الرسالة في المحادثة الصحيحة (كما كان)
  const targetChatId = streamingState.chatId;
  if (targetChatId && chats[targetChatId] && (streamingState.currentText || '')) {
    const now = Date.now();
    chats[targetChatId].messages.push({ role: 'assistant', content: streamingState.currentText, timestamp: now });
    chats[targetChatId].updatedAt = now;
    chats[targetChatId].order = now;
  }

  // إعادة الضبط
  streamingState.isStreaming = false;
  streamingState.currentMessageId = null;
  streamingState.streamingElement = null;
  streamingState.currentText = '';
  streamingState.streamController = null;
  streamingState.chatId = null;

  saveCurrentChat(targetChatId);
  scrollToBottom();
}

// ==============================
// بث وضع الفريق: تفكيك الدفق
// ==============================

// علامات الفصل المقترحة التي سيرسلها الخادم لاحقًا:
//   ⟦AGENT:BEGIN|<name>|<role>⟧
//   ⟦AGENT:END⟧
//
// إن لم تصل هذه العلامات، يعود العرض تلقائيًا إلى فقاعة واحدة (السلوك الحالي).

const teamStreaming = {
  buffer: '',
  activeAgent: null,   // { messageId, name, role, text }
  chatId: null
};

// عدّاد للألوان
let agentCounter = 0;

function createAgentStreamingMessage(name, role) {
  agentCounter++;
  const colorClass = `agent-color-${(agentCounter % 4) + 1}`; // 4 ألوان تتكرر

  const messagesArea = document.getElementById('messagesArea');
  const messageId = 'agent-' + Date.now().toString();
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-bubble message-assistant streaming-message ${colorClass}`;
  messageDiv.id = `message-${messageId}`;

  messageDiv.innerHTML = `
    <div class="flex items-center gap-2 text-xs opacity-75 mb-1">
      <i class="fas fa-users-cog"></i>
      <span>${escapeHtml(name)} <span class="opacity-60">(${escapeHtml(role)})</span></span>
    </div>
    <div class="message-content" id="content-${messageId}">
      <span class="streaming-cursor"></span>
    </div>
    <div class="streaming-indicator">
      <i class="fas fa-robot text-xs"></i>
      <span>يكتب ${escapeHtml(name)}</span>
      <div class="streaming-dots"><div class="streaming-dot"></div><div class="streaming-dot"></div><div class="streaming-dot"></div></div>
    </div>
  `;

  messagesArea.appendChild(messageDiv);
  scrollToBottom();

  teamStreaming.activeAgent = { messageId, name, role, text: '' };
  if (!teamStreaming.chatId) teamStreaming.chatId = currentChatId;
}

function appendToActiveAgent(text) {
  const a = teamStreaming.activeAgent;
  if (!a) {
    // لا يوجد «عضو» نشط: استخدم الفقاعة العامة الحالية للحفاظ على تجربة مقبولة
    appendToStreamingMessage(text);
    return;
  }
  a.text += text;

  const contentEl = document.getElementById(`content-${a.messageId}`);
  if (!contentEl) return;

  // إزالة المؤشّر المؤقت
  const cursor = contentEl.querySelector('.streaming-cursor');
  if (cursor) cursor.remove();

  contentEl.innerHTML = marked.parse(a.text);

  // إعادة المؤشّر طالما البث لم يكتمل
  const newCursor = document.createElement('span');
  newCursor.className = 'streaming-cursor';
  contentEl.appendChild(newCursor);

  contentEl.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
    addCodeHeader(block.parentElement);
  });

  smoothScrollToBottom();
}

function completeActiveAgent() {
  const a = teamStreaming.activeAgent;
  if (!a) return;
  const msgEl = document.getElementById(`message-${a.messageId}`);
  if (msgEl) {
    const indicator = msgEl.querySelector('.streaming-indicator');
    if (indicator) indicator.remove();
    msgEl.classList.remove('streaming-message');
  }

  // خزّن نص العضو داخل سجلّ المحادثة (نفس chatId الذي نحفظ فيه البث العام)
  const targetChatId = teamStreaming.chatId || currentChatId;
  if (targetChatId && chats[targetChatId] && (a.text || '')) {
    const now = Date.now();
    chats[targetChatId].messages.push({
      role: 'assistant',
      content: `### ${a.name} (${a.role})\n\n${a.text}`,
      timestamp: now
    });
    chats[targetChatId].updatedAt = now;
    chats[targetChatId].order = now;
  }

  teamStreaming.activeAgent = null;
}

function processTeamChunk(chunk) {
  // إن لم تُضبط العلامات من الخادم، نُمرّر الدفق كما هو إلى الفقاعة العامة
  if (!chunk.includes('⟦AGENT:BEGIN|') && !chunk.includes('⟦AGENT:END⟧')) {
    appendToActiveAgent(chunk); // إن وُجد «عضو» نشط سنلصق له، وإلا نعتمد الفقاعة العامة
    return;
  }

  teamStreaming.buffer += chunk;

  // عالجًا التتابعات المحتملة (قد تصل BEGIN/END داخل نفس الـchunk)
  let changed = true;
  while (changed) {
    changed = false;

    // 1) BEGIN
    const beginIdx = teamStreaming.buffer.indexOf('⟦AGENT:BEGIN|');
    if (beginIdx !== -1) {
      // انقل أي نص سابق للعضو الحالي/الفقاعة العامة
      const pre = teamStreaming.buffer.slice(0, beginIdx);
      if (pre) appendToActiveAgent(pre);

      // استخرج الهيدر: ⟦AGENT:BEGIN|name|role⟧
      const closeIdx = teamStreaming.buffer.indexOf('⟧', beginIdx);
      if (closeIdx !== -1) {
        const header = teamStreaming.buffer.slice(beginIdx + '⟦AGENT:BEGIN|'.length, closeIdx);
        const [name, role] = header.split('|');
        // ابدأ رسالة عضو جديدة (وأغلق السابقة إن وُجدت)
        if (teamStreaming.activeAgent) completeActiveAgent();
        createAgentStreamingMessage(name || 'عضو', role || 'عضو فريق');

        // احذف الرأس من المخبأ
        teamStreaming.buffer = teamStreaming.buffer.slice(closeIdx + 1);
        changed = true;
        continue;
      }
    }

    // 2) END
    const endIdx = teamStreaming.buffer.indexOf('⟦AGENT:END⟧');
    if (endIdx !== -1) {
      const body = teamStreaming.buffer.slice(0, endIdx);
      if (body) appendToActiveAgent(body);
      completeActiveAgent();
      teamStreaming.buffer = teamStreaming.buffer.slice(endIdx + '⟦AGENT:END⟧'.length);
      changed = true;
      continue;
    }
  }
}

function finalizeTeamStreaming() {
  // صبّ أي بقايا
  if (teamStreaming.buffer) {
    appendToActiveAgent(teamStreaming.buffer);
    teamStreaming.buffer = '';
  }
  // أغلق العضو الأخير
  completeActiveAgent();

  // إعادة تعيين متغيرات الفريق
  teamStreaming.activeAgent = null;
  teamStreaming.chatId = null;
  teamStreaming.buffer = '';

  // أغلق حالة البث العامة أيضًا
  if (streamingState.isStreaming) {
    streamingState.isStreaming = false;
    streamingState.currentMessageId = null;
    streamingState.streamingElement = null;
    streamingState.currentText = '';
    streamingState.streamController = null;
    streamingState.chatId = null;
    
    // تحديث زر الإرسال
    updateSendButton();
    
    // حفظ المحادثة
    if (teamStreaming.chatId || currentChatId) {
      saveCurrentChat(teamStreaming.chatId || currentChatId);
    }
  }
}

function smoothScrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTo({
        top: messagesArea.scrollHeight,
        behavior: 'smooth'
    });
}

async function sendMessage() {

    if (streamingState.isStreaming) { 
        cancelStreaming('new-send'); 
        return; 
    }

    // التحقق من إعدادات الفريق في وضع الفريق
    if (settings.activeMode === 'team' && !validateTeamSettings()) {
        return;
    }

    // ⚠️ في حال تغيّر المعرّف بعد حفظ سابق
    if (currentChatId && !chats[currentChatId]) {
        const latest = Object.values(chats).sort((a,b)=>(b.order||0)-(a.order||0))[0];
        currentChatId = latest ? latest._id : null;
    }

    const input = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const fileInput = document.getElementById('fileInput');

    if (!input.value.trim() && fileInput.files.length === 0) return;

    const message = input.value.trim();
    const files = Array.from(fileInput.files);

    // The API key check is no longer needed on the frontend.
    // The backend will handle API key management.

    console.log('Sending message to backend with provider:', settings.provider, 'model:', settings.model);

    // Disable input during processing
    input.disabled = true;
    sendButton.disabled = true;

    try {
        // Create new chat if needed
        if (!currentChatId) {
            await startNewChat();
        }

        // ✨✨✨ الميزة الجديدة تبدأ هنا ✨✨✨
        // 1. تحقق إذا كانت هذه هي الرسالة الأولى في المحادثة الحالية
        if (chats[currentChatId] && chats[currentChatId].messages.length === 0 && message) {
            // 2. إذا كانت كذلك، قم بتحديث عنوان المحادثة
            chats[currentChatId].title = message;
            // 3. قم بتحديث قائمة المحادثات فورًا لإظهار الاسم الجديد
            displayChatHistory();
        }
        // ✨✨✨ الميزة الجديدة تنتهي هنا ✨✨✨

        // Process files if any
        let attachments = [];
        if (files.length > 0) {
            attachments = await processAttachedFiles(files);
        }

        // Create user message
        const userMessage = {
    role: 'user',
    content: message,
    attachments: attachments.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        fileId: file.fileId || null,
        fileUrl: file.fileUrl || null
    })),
    timestamp: Date.now()
};

        // Add user message to chat
        chats[currentChatId].messages.push(userMessage);

        // Display user message with file cards
        displayUserMessage(userMessage);

        // Scroll to show new message
        setTimeout(() => scrollToBottom(), 100);

        // Clear input
        input.value = '';
        clearFileInput();

        // Show welcome screen if hidden
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('messagesContainer').classList.remove('hidden');

// ... بعد إنشاء userMessage وعرضه
createStreamingMessage();

// (اختياري) لو المستخدم كتب جملة تبدأ بـ "ابحث عبر الانترنت" ولم نغيّر العتبة
if (settings.enableWebBrowsing && /^\\s*ابحث\\s+عبر\\s+الانترنت/i.test(message)) {
  // اجعل العتبة أقل قليلاً لتميل الأداة للبحث
  settings.dynamicThreshold = Math.max(0, Math.min(0.4, settings.dynamicThreshold || 0.6));
}

// Send to AI with streaming
await sendToAIWithStreaming(chats[currentChatId].messages, attachments);

    } catch (error) {
        console.error('Error sending message:', error);
        showNotification(`حدث خطأ: ${error.message}`, 'error');

        // Complete streaming message with error
        if (streamingState.isStreaming) {
            appendToStreamingMessage('\n\n❌ عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.', true);
        }
    } finally {
        // Re-enable input
        input.disabled = false;
        sendButton.disabled = false;
        updateSendButton();
        input.focus();

        // Data will be saved when streaming completes
    }
}

// التحقق من صحة إعدادات الفريق قبل الإرسال
function validateTeamSettings() {
  if (!settings.team) {
    showNotification('إعدادات الفريق غير موجودة. يرجى إعداد الفريق أولاً.', 'error');
    return false;
  }

  if (!Array.isArray(settings.team.members) || settings.team.members.length === 0) {
    showNotification('يرجى إضافة أعضاء الفريق من الإعدادات قبل البدء.', 'error');
    return false;
  }

  // التحقق من أن كل عضو لديه اسم وموديل
  for (let i = 0; i < settings.team.members.length; i++) {
    const member = settings.team.members[i];
    if (!member.name || !member.name.trim()) {
      showNotification(`العضو رقم ${i + 1} لا يملك اسماً. يرجى تعديل الإعدادات.`, 'error');
      return false;
    }
    if (!member.model || !member.model.trim()) {
      showNotification(`العضو "${member.name}" لا يملك موديل محدد. يرجى تعديل الإعدادات.`, 'error');
      return false;
    }
  }

  return true;
}

function displayUserMessage(message) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-bubble message-user';

    let content = `<div class="message-content">${escapeHtml(message.content)}</div>`;

    // Add file cards if there are attachments
    if (message.attachments && message.attachments.length > 0) {
        const fileCards = message.attachments.map(file => createFileCard(file)).join('');
        content += fileCards;
    }

    messageDiv.innerHTML = content;
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

// ----------------------------------------------------------------------------------
// NEW: Functions to communicate with the local backend server
// ----------------------------------------------------------------------------------

async function sendToAIWithStreaming(chatHistory, attachments) {
  const lastUserMsg = (chatHistory || [])
    .slice().reverse().find(m => m.role === 'user')?.content || '';

  // البحث الذكي المتقدم - يحدد تلقائياً إذا كان المستخدم يريد البحث
  function shouldSearch(message) {
    const msg = message.toLowerCase().trim();
    
    // كلمات مفاتيح مباشرة للبحث
    const directSearchTerms = [
      'ابحث', 'بحث', 'البحث', 'تصفح', 'اعطني معلومات عن', 
      'ما هي آخر أخبار', 'آخر الأخبار', 'الأخبار الحديثة',
      'search', 'browse', 'find information', 'latest news', 'recent news'
    ];
    
    // مؤشرات على الحاجة لمعلومات حديثة
    const timeIndicators = [
      'اليوم', 'أمس', 'هذا الأسبوع', 'هذا الشهر', 'الآن', 'حالياً',
      'مؤخراً', 'جديد', 'حديث', 'متى', 'كم', 'أين',
      'today', 'yesterday', 'this week', 'this month', 'now', 'currently',
      'recently', 'new', 'recent', 'when', 'how much', 'where'
    ];
    
    // مواضيع تحتاج معلومات حديثة
    const currentTopics = [
      'سعر', 'أسعار', 'الأسهم', 'العملة', 'الطقس', 'الأخبار',
      'أحداث', 'تحديثات', 'إحصائيات', 'بيانات',
      'price', 'prices', 'stock', 'currency', 'weather', 'news',
      'events', 'updates', 'statistics', 'data'
    ];

    // فحص التطابقات المباشرة
    const hasDirectSearch = directSearchTerms.some(term => msg.includes(term));
    const hasTimeIndicator = timeIndicators.some(term => msg.includes(term));
    const hasCurrentTopic = currentTopics.some(term => msg.includes(term));
    
    // استخدام العتبة الديناميكية للحكم
    const threshold = settings.dynamicThreshold || 0.6;
    let searchScore = 0;
    
    if (hasDirectSearch) searchScore += 0.6;
    if (hasTimeIndicator) searchScore += 0.3;
    if (hasCurrentTopic) searchScore += 0.4;
    
    // أسئلة تحتاج معلومات حديثة
    if (msg.includes('؟') || msg.includes('?')) {
      if (hasTimeIndicator || hasCurrentTopic) searchScore += 0.2;
    }
    
    return searchScore >= threshold;
  }

  const forceWebBrowsing = settings.enableWebBrowsing && shouldSearch(lastUserMsg);
  
  // استخراج موضوع البحث بطريقة ذكية
  function extractSearchQuery(text) {
    // إزالة كلمات الاستفهام والأوامر
    let cleanText = text
      .replace(/^(ابحث\s+عن\s+|ابحث\s+|بحث\s+عن\s+|قم\s+بالبحث\s+عن\s+|search\s+for\s+|find\s+)/i, '')
      .replace(/^(ما\s+هي\s+|ما\s+هو\s+|what\s+is\s+|what\s+are\s+)/i, '')
      .replace(/\?$/i, '')
      .trim();
    
    return cleanText || text.trim();
  }
  
  const searchQuery = forceWebBrowsing ? extractSearchQuery(lastUserMsg) : '';

  // لا نحتاج للتحقق من وجود searchQuery لأننا نستخدم النص كاملاً

  const payload = {
    chatHistory, // للدردشة العادية
    history: chatHistory, // لوضع الفريق
    attachments: attachments.map(file => ({
      name: file.name, type: file.type, size: file.size,
      content: file.content, dataType: file.dataType, mimeType: file.mimeType
    })),
    settings,
    meta: { forceWebBrowsing, searchQuery }
  };

  try {
    await sendRequestToServer(payload);
  } catch (error) {
    console.error('Error sending request to server:', error);
    appendToStreamingMessage(`\n\n❌ حدث خطأ أثناء الاتصال بالخادم: ${error.message}`, true);
  }
}

async function sendRequestToServer(payload) {
  try {
    const token = localStorage.getItem('authToken');

    // 1) إنشاء المتحكّم وربطه بحالة البث
    const controller = new AbortController();
    streamingState.streamController = controller;

    // 2) اختيار المسار بحسب وضع التطبيق
    const endpoint = (settings.activeMode === 'team')
      ? `${API_BASE_URL}/api/team_chat`
      : `${API_BASE_URL}/api/chat`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server Error:', response.status, errorText);
      throw new Error(`خطأ من الخادم: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    try {
      while (true) {
        const { done, value } = await reader.read(); // سيُرمى AbortError عند الإلغاء
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (settings.activeMode === 'team') {
          processTeamChunk(chunk);          // بث مباشر لكل عضو
        } else {
          appendToStreamingMessage(chunk);  // السلوك القديم
        }
      }

      // اكتمال طبيعي
      if (settings.activeMode === 'team') {
        finalizeTeamStreaming();            // إقفال أي فقاعة عضو مفتوحة
      } else {
        appendToStreamingMessage('', true); // السلوك القديم
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        // تم الإلغاء: لا نرمي خطأ، أوقفنا البث بالفعل في cancelStreaming()
        console.debug('Streaming aborted by user.');
        return;
      }
      throw error;

    } finally {
      // تنظيف المقبض - لا تغيّر isStreaming هنا (تُدار في append/cancel)
      streamingState.streamController = null;
    }

  } catch (error) {
    // أخطاء شبكة/خادم
    console.error('Fetch error:', error);
    if (error.name !== 'AbortError') {
      appendToStreamingMessage(`\n\n❌ حدث خطأ أثناء الاتصال بالخادم: ${error.message}`, true);
    }
    throw error;
  }
}

// Rest of the existing functions (chat management, UI functions, etc.)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    // التمرير الفوري للأسفل
    messagesArea.scrollTop = messagesArea.scrollHeight;

    // التمرير السلس للأسفل كنسخة احتياطية
    setTimeout(() => {
        messagesArea.scrollTo({
            top: messagesArea.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);
}

function updateSendButton() {
  const input = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const fileInput = document.getElementById('fileInput');

  const hasText = input.value.trim().length > 0;
  const hasFiles = fileInput.files.length > 0;

  // إزالة أي ألوان سابقة
  sendButton.classList.remove(
    'bg-red-600', 'hover:bg-red-700',
    'bg-zeus-accent', 'hover:bg-zeus-accent-hover',
    'bg-gray-600', 'cursor-not-allowed', 'opacity-60'
  );

  if (streamingState.isStreaming) {
    sendButton.disabled = false;
    sendButton.onclick = () => cancelStreaming('button');
    sendButton.innerHTML = '<i class="fas fa-stop"></i>';
    sendButton.classList.add('bg-red-600', 'hover:bg-red-700');
  } else {
    const enabled = hasText || hasFiles;
    sendButton.disabled = !enabled;
    sendButton.onclick = () => sendMessage();
    sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';

    if (enabled) {
      sendButton.classList.add('bg-zeus-accent', 'hover:bg-zeus-accent-hover');
    } else {
      sendButton.classList.add('bg-gray-600', 'cursor-not-allowed', 'opacity-60');
    }
  }
}

// ==== إلغاء البث الحالي ====
function cancelStreaming(reason = 'user') {
  if (!streamingState.isStreaming) return;

  try {
    if (streamingState.streamController) {
      streamingState.streamController.abort(); // يقطع fetch فوراً
    }
  } catch (_) {}

  // إنهاء بصري أنيق مع حفظ ما وصلنا إليه
  appendToStreamingMessage('\n\n⏹️ تم إيقاف التوليد.', true);

  // تحديث الحالة والزر
  streamingState.isStreaming = false;
  streamingState.streamController = null;
  updateSendButton();

  // إشعار اختياري
  showNotification('تم إيقاف التوليد', 'info');
}

// إلغاء عند إغلاق/تحديث الصفحة
window.addEventListener('beforeunload', () => {
  if (streamingState.isStreaming && streamingState.streamController) {
    streamingState.streamController.abort();
  }
});

// اختصار لوحة المفاتيح: Escape يوقف البث
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && streamingState.isStreaming) {
    cancelStreaming('escape');
  }
});

// Chat management functions
