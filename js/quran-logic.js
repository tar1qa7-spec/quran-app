// Quran Logic for Sadaqah Jariyah App

let allSurahs = [];
let currentAyahSelected = { surah: 1, ayah: 1 };
let ayahAudio = new Audio();

const TAFSIR_API_BASE = "https://api.alquran.cloud/v1/ayah/";

document.addEventListener('DOMContentLoaded', async () => {
    await initQuranIndex();

    const searchInput = document.getElementById('surah-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterIndex(e.target.value));
    }

    document.querySelectorAll('.index-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.index-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderCurrentView(tab.dataset.view);
        };
    });
});

async function initQuranIndex() {
    const loader = document.getElementById('loading-index');
    try {
        let data = await getQuranData();
        if (!data) {
            const resp = await fetch("https://api.alquran.cloud/v1/quran/quran-uthmani");
            const res = await resp.json();
            data = res.data.surahs;
            await saveToCache('quranData', 'fullQuran', res.data);
        }
        allSurahs = data;
        renderCurrentView('surahs');
        if (loader) loader.style.display = 'none';
    } catch (e) { console.error(e); }
}

function renderCurrentView(view) {
    if (view === 'surahs') renderSurahList(allSurahs);
    else if (view === 'juz') renderJuzList();
    else if (view === 'hizb') renderHizbList();
}

function renderSurahList(surahs) {
    const container = document.getElementById('surah-list');
    if (!container) return;
    container.innerHTML = '';
    surahs.forEach(s => {
        const card = document.createElement('div');
        card.className = 'glass-panel surah-card animate-fade';
        card.style.padding = '18px';
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="surah-number">${s.number}</div>
                <div style="flex: 1;">
                    <h3 class="arabic-text" style="font-size: 1.4rem; color: var(--accent);">${s.name}</h3>
                    <p style="font-size: 0.8rem; opacity: 0.6;">${s.englishName} • ${s.ayahs.length} آية</p>
                </div>
            </div>
        `;
        card.onclick = () => openSurah(s.number);
        container.appendChild(card);
    });
}

function filterIndex(query) {
    if (!query) return renderSurahList(allSurahs);
    const searchTerm = query.toLowerCase().trim();
    const filtered = allSurahs.filter(s => s.name.includes(searchTerm) || s.number.toString() === searchTerm);
    renderSurahList(filtered);
}

function handleAyahClick(surah, ayah) {
    currentAyahSelected = { surah, ayah };
    const modal = document.getElementById('ayah-options-modal');
    const title = document.getElementById('ayah-modal-title');
    if (title) title.innerText = `سورةُ ${allSurahs[surah - 1].name} - الآيةُ ${ayah}`;
    if (modal) modal.style.display = 'flex';
}

function closeAyahOptions() {
    const modal = document.getElementById('ayah-options-modal');
    if (modal) modal.style.display = 'none';
    if (ayahAudio) ayahAudio.pause();
}

function playAyahVoice() {
    const { surah, ayah } = currentAyahSelected;
    const btn = document.getElementById('btn-play-voice');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التشغيل...';
    if (ayahAudio) ayahAudio.pause();
    ayahAudio.src = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${surah}:${ayah}.mp3`;
    ayahAudio.play().then(() => {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> جاري الاستماع';
        ayahAudio.onended = () => { btn.innerHTML = originalText; };
    }).catch(() => {
        btn.innerHTML = 'خطأ في الصوت';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    });
}

function showTafsirForSelected() {
    const { surah, ayah } = currentAyahSelected;
    closeAyahOptions();
    showTafsir(surah, ayah);
}

async function openSurah(number) {
    document.getElementById('index-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'block';

    const ayahList = document.getElementById('ayah-list');
    ayahList.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:var(--accent);"></i><p>جاري تحضير المصحف الشريف...</p></div>';

    const surahInfo = allSurahs[number - 1];

    try {
        const resp = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${number}`);
        const data = await resp.json();
        const verses = data.verses;

        ayahList.innerHTML = `
            <div class="mushaf-header animate-fade">
                <div class="mushaf-surah-title">
                    <span style="font-size: 2.8rem;">${surahInfo.name}</span>
                    <span style="font-size: 0.9rem; opacity: 0.8; margin-top: 5px;">${surahInfo.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • ${surahInfo.ayahs.length} آية</span>
                </div>
            </div>
        `;

        if (number !== 1 && number !== 9) {
            const bism = document.createElement('div');
            bism.className = 'mushaf-bismillah animate-fade';
            bism.innerText = "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ";
            ayahList.appendChild(bism);
        }

        const page = document.createElement('div');
        page.className = 'mushaf-page-container animate-fade';

        let content = "";
        verses.forEach((v, i) => {
            const aNum = i + 1;
            content += `<span class="mushaf-text" onclick="handleAyahClick(${number}, ${aNum})">${v.text_uthmani}</span> 
                        <span class="mushaf-ayah-num" onclick="handleAyahClick(${number}, ${aNum})">${aNum}</span> `;
        });

        page.innerHTML = content;
        ayahList.appendChild(page);

        const footer = document.createElement('div');
        footer.className = 'mushaf-footer animate-fade';
        ayahList.appendChild(footer);

        document.getElementById('page-title').innerText = surahInfo.name;
        window.scrollTo(0, 0);
    } catch (e) {
        ayahList.innerHTML = '<p style="text-align:center; padding: 40px;">عذراً، فشل التحميل. يرجى التحقق من الاتصال.</p>';
    }
}

async function showTafsir(surah, ayah) {
    const modal = document.getElementById('tafsir-modal');
    const text = document.getElementById('tafsir-text');
    const title = document.getElementById('tafsir-title');
    if (!modal || !text) return;
    title.innerText = `تفسير الآية ${ayah}`;
    text.innerText = 'جاري جلب التفسير من المصدر...';
    modal.style.display = 'flex';
    try {
        const resp = await fetch(`${TAFSIR_API_BASE}${surah}:${ayah}/ar.muyassar`);
        const res = await resp.json();
        text.innerText = res.data.text;
    } catch (e) { text.innerText = 'فشل التحميل.'; }
}

function closeModal() { document.getElementById('tafsir-modal').style.display = 'none'; }
window.addEventListener('popstate', () => { if (document.getElementById('reader-view').style.display === 'block') { document.getElementById('reader-view').style.display = 'none'; document.getElementById('index-view').style.display = 'block'; } });
