let chunks = []; // 每项 { text: string, breakAfter: boolean }
let index = 0;

const LINEBREAK_SVG = `<span class="linebreak-icon" title="换行"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg></span>`;
const INDENT_HINT = `<span class="indent-hint" title="开头空两格"><span class="indent-rect"></span><span class="indent-rect"></span></span>`;

const pageInput = document.getElementById('pageInput');
const pageTotal = document.getElementById('pageTotal');

/* ---------------- Markdown 清理 ---------------- */
function normalizeMarkdown(text) {
    let lines = text.split('\n');
    let processed = [];

    for (let line of lines) {
        let trimmed = line.trim();

        // 分隔线 --- *** ___ (整行) -> 删除
        if (/^([-*_])(\s*\1){2,}\s*$/.test(trimmed)) {
            continue;
        }

        // 标题 # ## ### -> 去掉前缀
        trimmed = trimmed.replace(/^#{1,6}\s+/, '');
        // 引用 >
        trimmed = trimmed.replace(/^>\s?/, '');
        // 列表标记 -, *, +, 数字./数字、
        trimmed = trimmed.replace(/^([-*+]|\d+[.、])\s+/, '');

        processed.push(trimmed);
    }

    text = processed.join('\n');

    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');      // 图片
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');        // 链接
    text = text.replace(/`([^`]+)`/g, '$1');                    // 行内代码
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');              // 加粗 **
    text = text.replace(/__([^_]+)__/g, '$1');                  // 加粗 __
    text = text.replace(/~~([^~]+)~~/g, '$1');                  // 删除线
    text = text.replace(/\*([^*\n]+)\*/g, '$1');                // 斜体 *
    text = text.replace(/(?<![\w_])_([^_\n]+)_(?![\w_])/g, '$1'); // 斜体 _

    return text;
}

/* ---------------- 分段与断句 ---------------- */
function splitText(text) {
    text = normalizeMarkdown(text);

    const breakPunctuation = /[。！？]/;
    // 可被前一句吸收的尾随标点（避免标点孤零零出现在下一行开头）
    const trailingPunct = /[，。！？、；：""''「」『』（）《》【】…—～,\.!\?;:'"\)\]\}]/;
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    let result = [];

    paragraphs.forEach((para, pIdx) => {
        let raw = [];
        let current = "";

        for (let i = 0; i < para.length; i++) {
            let ch = para[i];
            current += ch;

            if (breakPunctuation.test(ch)) {
                // 句末标点：在此断句
                if (current.trim()) raw.push(current.trim());
                current = "";
            } else if (current.length >= maxChars) {
                // 达到最大字数，向前吞并尾随标点
                let j = i + 1;
                while (j < para.length && trailingPunct.test(para[j])) {
                    current += para[j];
                    j++;
                    // 遇到句末标点则吞入后停止
                    if (breakPunctuation.test(para[j - 1])) break;
                }
                raw.push(current.trim());
                current = "";
                i = j - 1;
            }
        }
        if (current.trim()) raw.push(current.trim());

        raw.forEach((b, bIdx) => {
            result.push({
                text: b,
                breakAfter: bIdx === raw.length - 1 && pIdx < paragraphs.length - 1,
                paragraphStart: bIdx === 0
            });
        });
    });

    return result;
}

/* ---------------- 主题切换 ---------------- */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIconSun').style.display = theme === 'dark' ? 'none' : 'block';
    document.getElementById('themeIconMoon').style.display = theme === 'dark' ? 'block' : 'none';
    localStorage.setItem('copyHelperTheme', theme);
}

function initTheme() {
    const saved = localStorage.getItem('copyHelperTheme');
    if (saved) {
        applyTheme(saved);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    applyTheme(e.matches ? 'dark' : 'light');
});

/* ---------------- 设置与关于弹窗 ---------------- */
const settingsOverlay = document.getElementById('settingsOverlay');

document.getElementById('settingsToggle').addEventListener('click', () => {
    settingsOverlay.classList.remove('hidden');
});
document.getElementById('settingsClose').addEventListener('click', () => {
    settingsOverlay.classList.add('hidden');
});
settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden');
});
document.getElementById('reEnterBtn').addEventListener('click', () => {
    settingsOverlay.classList.add('hidden');
    reset();
});

/* ---------------- 用户协议弹窗 ---------------- */
const agreementOverlay = document.getElementById('agreementOverlay');

if (agreementOverlay) {
    document.getElementById('agreementBtn').addEventListener('click', () => {
        agreementOverlay.classList.remove('hidden');
    });
    document.getElementById('agreementClose').addEventListener('click', () => {
        agreementOverlay.classList.add('hidden');
    });
    agreementOverlay.addEventListener('click', (e) => {
        if (e.target === agreementOverlay) agreementOverlay.classList.add('hidden');
    });
}

/* ---------------- 简约模式 ---------------- */
function applySimpleMode(enabled) {
    document.documentElement.setAttribute('data-simple', enabled ? 'true' : 'false');
    localStorage.setItem('copyHelperSimple', enabled ? '1' : '0');
}

function initSimpleMode() {
    const saved = localStorage.getItem('copyHelperSimple') === '1';
    document.getElementById('simpleModeToggle').checked = saved;
    applySimpleMode(saved);
}

document.getElementById('simpleModeToggle').addEventListener('change', (e) => {
    applySimpleMode(e.target.checked);
});

/* ---------------- 单行最大字数 ---------------- */
let maxChars = 10;

function applyMaxChars(value) {
    maxChars = value;
    localStorage.setItem('copyHelperMaxChars', String(value));
}

function initMaxChars() {
    const saved = parseInt(localStorage.getItem('copyHelperMaxChars'), 10);
    const val = (saved >= 5 && saved <= 50) ? saved : 10;
    document.getElementById('maxCharsInput').value = val;
    applyMaxChars(val);
}

document.getElementById('maxCharsInput').addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 5) val = 5;
    if (val > 50) val = 50;
    e.target.value = val;
    applyMaxChars(val);
});

/* ---------------- 点击以递进 ---------------- */
let clickAdvanceEnabled = false;

function applyClickAdvance(enabled) {
    clickAdvanceEnabled = enabled;
    localStorage.setItem('copyHelperClickAdvance', enabled ? '1' : '0');
}

function initClickAdvance() {
    const saved = localStorage.getItem('copyHelperClickAdvance') === '1';
    document.getElementById('clickAdvanceToggle').checked = saved;
    applyClickAdvance(saved);
}

document.getElementById('clickAdvanceToggle').addEventListener('change', (e) => {
    applyClickAdvance(e.target.checked);
});

document.addEventListener('click', (e) => {
    if (!clickAdvanceEnabled) return;
    // 忽略按钮、输入框、链接、设置面板内的点击
    if (e.target.closest('button, input, a, label, #progress, #settingsOverlay, #setupOverlay')) return;
    const setupHidden = document.getElementById('setupOverlay').classList.contains('hidden');
    if (!setupHidden) return;
    if (!settingsOverlay.classList.contains('hidden')) return;
    next();
});

/* ---------------- 移动端检测 ---------------- */
function detectMobile() {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 600;
    document.body.classList.toggle('mobile-mode', isMobile);
}
window.addEventListener('resize', detectMobile);

/* ---------------- 构建底层原文地图 ---------------- */
function buildBgContent() {
    let html = '';
    chunks.forEach((chunk, i) => {
        html += `<span class="bg-chunk" data-index="${i}">${escapeHtml(chunk.text)}</span>`;
        if (chunk.breakAfter) {
            html += '<br><br>';
        }
    });
    document.getElementById('bgContent').innerHTML = html;
}

/* ---------------- 流程控制 ---------------- */
function start() {
    const text = document.getElementById('inputText').value.trim();
    if (!text) return;

    chunks = splitText(text);
    index = 0;

    buildBgContent();

    const setupOverlay = document.getElementById('setupOverlay');
    setupOverlay.classList.add('fade-out');
    setupOverlay.addEventListener('animationend', function handler() {
        setupOverlay.removeEventListener('animationend', handler);
        setupOverlay.classList.add('hidden');
        setupOverlay.classList.remove('fade-out');
    }, { once: true });
    document.getElementById('display').style.display = 'block';
    document.getElementById('finished').style.display = 'none';

    pageTotal.textContent = '/' + chunks.length;
    pageInput.style.width = (String(chunks.length).length + 0.2) + 'ch';

    detectMobile();
    update();
}

function update(direction) {
    const prev = document.getElementById('prev');
    const currentText = document.getElementById('currentText');
    const next = document.getElementById('next');

    if (index >= chunks.length) {
        document.getElementById('display').style.display = 'none';
        const finished = document.getElementById('finished');
        finished.style.display = 'flex';
        // 完成庆祝动画
        const mark = finished.querySelector('.mark');
        const text = finished.querySelector('.text');
        const sub = finished.querySelector('.sub');
        mark.classList.remove('anim-pop');
        text.classList.remove('anim-up');
        sub.classList.remove('anim-up');
        mark.offsetHeight;
        mark.classList.add('anim-pop');
        text.style.animationDelay = '0.2s';
        text.classList.add('anim-up');
        sub.style.animationDelay = '0.45s';
        sub.classList.add('anim-up');
        return;
    }

    /* ---- 中层主显示 ---- */
    prev.innerHTML = index > 0 ? escapeHtml(chunks[index - 1].text) : '';

    let currentHtml = '';
    if (chunks[index].paragraphStart) {
        currentHtml += INDENT_HINT;
    }
    currentHtml += escapeHtml(chunks[index].text);
    if (chunks[index].breakAfter) {
        currentHtml += LINEBREAK_SVG;
    }
    currentText.innerHTML = currentHtml;

    next.innerHTML = index < chunks.length - 1 ? escapeHtml(chunks[index + 1].text) : '';

    pageInput.value = index + 1;

    // 歌词式滚动动画（动文字不动边框和页码）
    const dirClass = direction === 'backward' ? 'slide-down' : 'slide-up';
    prev.classList.remove('slide-up', 'slide-down');
    currentText.classList.remove('slide-up', 'slide-down', 'text-glow');
    next.classList.remove('slide-up', 'slide-down');
    currentText.offsetHeight; // 强制重排
    prev.classList.add(dirClass);
    currentText.classList.add(dirClass, 'text-glow');
    next.classList.add(dirClass);

    /* ---- 底层地图：高亮当前句并滚动 ---- */
    const prevActive = document.querySelector('.bg-chunk.active');
    if (prevActive) prevActive.classList.remove('active');

    const activeChunk = document.querySelector(`.bg-chunk[data-index="${index}"]`);
    if (activeChunk) {
        activeChunk.classList.add('active');
        activeChunk.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function next() {
    if (index < chunks.length) {
        index++;
        update('forward');
    }
}

function back() {
    if (index > 0) {
        index--;
        update('backward');
    }
}

function reset() {
    document.getElementById('setupOverlay').classList.remove('hidden');
    document.getElementById('display').style.display = 'none';
    document.getElementById('finished').style.display = 'none';
}

/* ---------------- 页码跳转 ---------------- */
function jumpToPage() {
    const val = parseInt(pageInput.value, 10);
    if (!isNaN(val) && val >= 1 && val <= chunks.length) {
        index = val - 1;
        update();
    } else {
        pageInput.value = index + 1;
    }
    pageInput.blur();
}

pageInput.addEventListener('focus', () => {
    pageInput.select();
});

document.getElementById('progress').addEventListener('click', () => {
    pageInput.focus();
    pageInput.select();
});

pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        jumpToPage();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        pageInput.value = index + 1;
        pageInput.blur();
    }
});

pageInput.addEventListener('blur', () => {
    pageInput.value = index + 1;
});

/* ---------------- 事件绑定 ---------------- */
document.addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'pageInput') return; // 输入框自行处理

    if (agreementOverlay && !agreementOverlay.classList.contains('hidden')) {
        if (e.key === 'Escape') {
            e.preventDefault();
            agreementOverlay.classList.add('hidden');
        }
        return;
    }

    if (!settingsOverlay.classList.contains('hidden')) {
        if (e.key === 'Escape') {
            e.preventDefault();
            settingsOverlay.classList.add('hidden');
        }
        return; // 设置面板打开时不响应其他快捷键
    }

    const setupHidden = document.getElementById('setupOverlay').classList.contains('hidden');
    if (!setupHidden) return; // 输入弹窗打开时不响应快捷键

    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
    } else if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        reset();
    }
});

document.getElementById('mobileNext').addEventListener('click', next);
document.getElementById('mobileBack').addEventListener('click', back);

/* ---------------- 初始化 ---------------- */
initTheme();
initSimpleMode();
initMaxChars();
initClickAdvance();
detectMobile();
