// Audio Logic for Sadaqah Jariyah App

function normalizeArabic(text) {
    if (!text) return "";
    return text.replace(/[ًٌٍَُِّْ]/g, "") // Remove harakat
        .replace(/[أإآ]/g, "ا") // Normalize Alifs
        .replace(/ى/g, "ي") // Normalize Yaa/Alif Maqsura
        .replace(/(عبد|ابو|ابن)\s+/g, "$1") // Connect Abd, Abu, Ibn
        .replace(/\s+/g, " ") // Single spaces
        .trim();
}

const surahNames = [
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
    "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
    "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
    "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
    "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
    "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
    "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
    "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
    "المسد", "الإخلاص", "الفلق", "الناس"
];

const reciters = {
    noreen: {
        name: "نورين محمد صديق",
        baseUrl: "https://archive.org/download/NoreenMohammadSiddiq/",
        pattern: (num) => `${num.toString().padStart(3, '0')}.mp3`
    },
    alzain: {
        name: "الزين محمد أحمد",
        baseUrl: "https://archive.org/download/kquran.com__Alzain-Mohamed-Ahmad/kquran.com_",
        pattern: (num) => `${num.toString().padStart(3, '0')}.mp3`
    },
    alfateh: {
        name: "الفاتح محمد عثمان الزبير",
        baseUrl: "https://archive.org/download/golmami2005_yahoo_002/",
        pattern: (num) => `${num.toString().padStart(3, '0')}.mp3`
    }
};

const reciterIdMap = {
    noreen: 138,
    alzain: 13,
    alfateh: 211,
    'ar.alafasy': 118,
    'ar.abdulbasitmurattal': 1,
    'ar.abdulsamad': 1,
    'ar.abdullahbasfar': 3,
    'ar.abdurrahmaansudais': 4,
    'ar.ahmedajamy': 14,
    'ar.alafasy': 118,
    'ar.hanirifai': 105,
    'ar.husary': 104,
    'ar.husarymujawwad': 104,
    'ar.hudhaify': 106,
    'ar.minshawi': 103,
    'ar.minshawimujawwad': 103,
    'ar.saadsaghamidi': 12,
    'ar.shuraym': 11,
    'ar.mahermuaiqly': 6,
    'ar.nasserallatif': 55,
    'ar.thubaiti': 161,
    'ar.ghamadi': 12,
    'ar.yasseradosary': 32,
    'ar.faresabbad': 64,
    'ar.kalbani': 21
};

const builtInTimings = {
    'alfateh_1': [
        { ayah: 1, start_time: 0, end_time: 4000 },
        { ayah: 2, start_time: 4000, end_time: 7500 },
        { ayah: 3, start_time: 7500, end_time: 11000 },
        { ayah: 4, start_time: 11000, end_time: 14000 },
        { ayah: 5, start_time: 14000, end_time: 21000 },
        { ayah: 6, start_time: 21000, end_time: 25000 },
        { ayah: 7, start_time: 25000, end_time: 35000 }
    ]
};

let extraRecitersData = [];
let currentReciter = null;
let currentPlaylist = [];
let currentAyahIndex = 0;
let currentSurahNum = 1;

let ayahTimings = [];
let currentTextData = null;
let currentTafsirData = null;
let lastDisplayedIndex = -1;

const mainAudio = document.getElementById('main-audio') || new Audio();
const playerBar = document.getElementById('player-bar');

let mp3QuranRecitersMap = {};

async function fetchMoreReciters() {
    const btn = document.getElementById('btn-more-reciters');
    const container = document.getElementById('extra-reciters-list');
    if (!btn || !container) return;

    if (container.style.display === 'block') { container.style.display = 'none'; btn.innerHTML = '<i class="fa-solid fa-angle-down"></i> عرض المزيد من القراء'; return; }
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...';

    try {
        const res = await fetch('https://api.alquran.cloud/v1/edition?format=audio&language=ar');
        const data = await res.json();
        extraRecitersData = data.data;

        const mp3Res = await fetch('https://www.mp3quran.net/api/v3/reciters');
        const mp3Data = await mp3Res.json();

        mp3Data.reciters.forEach(r => {
            const normName = normalizeArabic(r.name);
            r.moshaf.forEach(m => {
                mp3QuranRecitersMap[normName] = { server: m.server, readId: r.id };
            });
        });

        renderExtraReciters(extraRecitersData);
        container.style.display = 'block';
        btn.innerHTML = '<i class="fa-solid fa-angle-up"></i> إخفاء القراء الإضافيين';
    } catch (e) { btn.innerHTML = 'فشل التحميل، حاول لاحقاً'; }
}

function renderExtraReciters(list) {
    const container = document.getElementById('extra-reciters-list');
    if (!container) return;
    container.innerHTML = '';
    list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'glass-panel reciter-card animate-fade';
        card.style.padding = '15px';
        card.style.marginBottom = '10px';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div style="background: var(--primary-light); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                <i class="fa-solid fa-microphone"></i>
            </div>
            <div style="flex: 1;">
                <h4 class="arabic-text" style="font-size: 1.1rem;">${item.name}</h4>
                <p style="font-size: 0.7rem; opacity: 0.6;">${item.englishName}</p>
            </div>
        `;
        card.onclick = () => loadReciter(item.identifier, true);
        container.appendChild(card);
    });
}

async function loadReciter(id, isExtra = false) {
    if (isExtra) {
        currentReciter = extraRecitersData.find(r => r.identifier === id);
        if (currentReciter) {
            currentReciter.isExtra = true;
            currentReciter.id = id;
            currentReciter.isFullMP3 = true;
            const normName = normalizeArabic(currentReciter.name);
            const match = mp3QuranRecitersMap[normName];
            if (match) currentReciter.readId = match.readId;
        }
    } else { currentReciter = { ...reciters[id], id: id, isExtra: false, isFullMP3: true }; }

    if (!currentReciter) return;
    const nameEl = document.getElementById('current-reciter-name');
    if (nameEl) nameEl.innerText = currentReciter.name;
    document.getElementById('audio-title').innerText = currentReciter.name;
    document.getElementById('reciters-view').style.display = 'none';
    document.getElementById('surah-list-view').style.display = 'block';
    const container = document.getElementById('audio-items-container');
    container.innerHTML = '';
    surahNames.forEach((name, index) => {
        const surahNum = index + 1;
        const item = document.createElement('div');
        item.className = 'surah-audio-item';
        let fileUrl = currentReciter.isExtra
            ? `https://cdn.islamic.network/quran/audio-surah/128/${id}/${surahNum}.mp3`
            : currentReciter.baseUrl + currentReciter.pattern(surahNum);
        let key = currentReciter.isExtra ? `extra_${id}` : id;

        // Check if this surah is cached locally
        const offlineUrl = getOfflineUrl(id, surahNum);
        const offlineBadge = offlineUrl
            ? `<span title="محفوظ بدون إنترنت" style="color:#2ecc71;font-size:0.7rem;"><i class="fa-solid fa-circle-check"></i></span>`
            : '';

        item.innerHTML = `
            <div style="width:30px; color:var(--accent); font-weight:bold; font-size:0.9rem;">${surahNum}</div>
            <div style="flex:1;">
                <h4 class="arabic-text" style="font-size:1rem;">سورة ${name}</h4>
                ${offlineBadge}
            </div>
            <button
                onclick="downloadSurah('${fileUrl}', 'سورة ${name}', ${surahNum}, '${id}', this)"
                title="تحميل للاستماع بدون إنترنت"
                style="background:none;border:none;color:var(--accent);font-size:1rem;cursor:pointer;margin-left:4px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
                <i class="${offlineUrl ? 'fa-solid fa-circle-check' : 'fa-solid fa-download'}"></i>
            </button>
            <button
                onclick="playTrack('${fileUrl}','سورة ${name}','${currentReciter.name}',${surahNum},'${key}')"
                style="background:var(--accent);border:none;color:var(--primary);width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                <i class="fa-solid fa-play"></i>
            </button>
        `;
        container.appendChild(item);
    });
}

async function downloadSurah(url, title, surahNum, identifier, btnEl) {
    // Show loading
    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btnEl.disabled = true;

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const blob = await resp.blob();

        // Use File System Access API if available, else fallback to <a download>
        if ('showSaveFilePicker' in window) {
            const fh = await window.showSaveFilePicker({
                suggestedName: `${surahNum.toString().padStart(3, '0')}_${title}.mp3`,
                types: [{ description: 'MP3 Audio', accept: { 'audio/mpeg': ['.mp3'] } }]
            });
            const writable = await fh.createWritable();
            await writable.write(blob);
            await writable.close();
        } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${surahNum.toString().padStart(3, '0')}_${title}.mp3`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        }

        btnEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        btnEl.style.color = '#2ecc71';
        btnEl.title = 'تم التحميل';
    } catch (e) {
        if (e.name === 'AbortError') {
            btnEl.innerHTML = '<i class="fa-solid fa-download"></i>';
        } else {
            btnEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            btnEl.style.color = '#e74c3c';
            setTimeout(() => {
                btnEl.innerHTML = '<i class="fa-solid fa-download"></i>';
                btnEl.style.color = 'var(--accent)';
            }, 3000);
        }
    }
    btnEl.disabled = false;
}

function getOfflineUrl(identifier, surahNum, kbps = 128) {
    if (typeof window.OFFLINE_AUDIO === 'undefined') return null;
    return window.OFFLINE_AUDIO?.[identifier]?.[kbps]?.[surahNum] ||
        window.OFFLINE_AUDIO?.[identifier]?.[64]?.[surahNum] ||
        window.OFFLINE_AUDIO?.[identifier]?.[32]?.[surahNum] || null;
}

function playTrack(url, title, reciterName, surahNum, reciterKey) {
    currentSurahNum = surahNum;
    playerBar.style.display = 'block';
    document.getElementById('now-playing-title').innerText = title;
    document.getElementById('now-playing-reciter').innerText = reciterName;
    document.getElementById('spiritual-surah-name').innerText = title;
    const fsTitle = document.getElementById('fs-surah-title');
    if (fsTitle) fsTitle.innerText = title;
    const trackDesc = document.getElementById('spiritual-track-desc');
    if (trackDesc) trackDesc.innerText = `القارئ ${reciterName}`;

    // Prefer offline file if available
    const identifier = currentReciter?.id || reciterKey;
    const offlineUrl = getOfflineUrl(identifier, surahNum);
    const finalUrl = offlineUrl || url;
    const isOffline = !!offlineUrl;

    mainAudio.src = finalUrl;
    mainAudio.play()
        .then(() => updatePlayIcon(true))
        .catch(e => {
            console.error('Playback failed:', e);
            // Show error in UI
            const title_el = document.getElementById('now-playing-title');
            if (title_el) title_el.innerText = '⚠ تعذّر التشغيل - تحقق من الإنترنت';
        });

    if (isOffline) {
        console.log(`📂 Playing from offline cache: ${finalUrl}`);
    }

    const extraId = (reciterKey && reciterKey.startsWith('extra_')) ? reciterKey.replace('extra_', '') : null;
    const readId = extraId ? (currentReciter?.readId || reciterIdMap[extraId] || 0) : (reciterIdMap[reciterKey] || 0);
    fetchAyahTimings(surahNum, readId, reciterKey);
    loadQuranText(surahNum);
}

async function fetchAyahTimings(surah, read, reciterKey) {
    ayahTimings = [];
    const builtInKey = `${reciterKey}_${surah}`;
    if (builtInTimings[builtInKey]) { ayahTimings = builtInTimings[builtInKey]; return; }
    if (!read) return;
    try {
        const res = await fetch(`https://mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${read}`);
        if (res.ok) ayahTimings = await res.json();
    } catch (e) { console.warn("Sync failed"); }
}

async function loadQuranText(surahNum) {
    currentTextData = null; currentTafsirData = null; lastDisplayedIndex = -1;
    try {
        const allSurahs = await getQuranData();
        if (allSurahs && allSurahs[surahNum - 1]) currentTextData = allSurahs[surahNum - 1];
        else {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`);
            const data = await res.json();
            currentTextData = data.data;
        }
        const cachedTafsir = await getTafsirFromDB(`tafsir_${surahNum}`);
        if (cachedTafsir) currentTafsirData = cachedTafsir.data;
        else {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.muyassar`);
            const data = await res.json();
            currentTafsirData = data.data;
            saveTafsirToDB(`tafsir_${surahNum}`, currentTafsirData);
        }
    } catch (e) { console.warn("Text load failed"); }
}

function updateSyncDisplay() {
    if (!currentTextData) return;
    let index = -1;
    if (ayahTimings.length > 0) {
        const time = mainAudio.currentTime * 1000;
        const entry = ayahTimings.find(t => time >= t.start_time && time <= t.end_time);
        if (entry) index = entry.ayah - 1;
        else {
            const past = [...ayahTimings].reverse().find(t => time >= t.end_time);
            index = past ? past.ayah - 1 : 0;
        }
    } else index = 0;

    if (index !== -1 && index !== lastDisplayedIndex && index < currentTextData.ayahs.length) {
        lastDisplayedIndex = index;
        displayAyahWithTransition(index);
    }
}

function displayAyahWithTransition(index) {
    const ayahEl = document.getElementById('spiritual-ayah-text');
    const tafsirText = document.getElementById('spiritual-tafsir-text');
    const fsAyah = document.getElementById('fs-ayah-text');
    if (!ayahEl || !currentTextData) return;

    // Fade out text
    ayahEl.style.opacity = '0';
    if (fsAyah) fsAyah.style.opacity = '0';

    setTimeout(() => {
        const ayah = currentTextData.ayahs[index];
        if (ayah) {
            ayahEl.innerText = ayah.text;
            if (fsAyah) fsAyah.innerText = ayah.text;
        }
        if (currentTafsirData && currentTafsirData.ayahs && currentTafsirData.ayahs[index]) {
            if (tafsirText) tafsirText.innerText = currentTafsirData.ayahs[index].text;
        }
        ayahEl.style.opacity = '1';
        if (fsAyah) fsAyah.style.opacity = '1';
    }, 300);

    // NOTE: Image rotation is intentionally NOT tied to ayah change
    // to keep the user focused on the text. Images rotate on their own timer.
}

mainAudio.addEventListener('timeupdate', () => {
    const progress = (mainAudio.currentTime / mainAudio.duration) * 100;
    const pb = document.getElementById('progress-bar');
    if (pb) pb.style.width = `${progress}%`;
    const spb = document.getElementById('spiritual-progress-bar');
    if (spb) spb.style.width = `${progress}%`;
    updateSyncDisplay();
});

mainAudio.addEventListener('ended', () => playNextSurah());

function togglePlay() {
    if (mainAudio.paused) mainAudio.play().then(() => updatePlayIcon(true));
    else { mainAudio.pause(); updatePlayIcon(false); }
}

function updatePlayIcon(isPlaying) {
    const i1 = document.getElementById('master-play-btn')?.querySelector('i');
    if (i1) i1.className = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";
    const i2 = document.getElementById('spiritual-play-btn-icon');
    if (i2) i2.className = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";
}

function openSpiritualView() { document.getElementById('spiritual-view').style.display = 'flex'; document.body.style.overflow = 'hidden'; }
function closeSpiritualView() { document.getElementById('spiritual-view').style.display = 'none'; document.body.style.overflow = 'auto'; }
function playNextSurah() { if (currentSurahNum < 114) loadReciterSurah(currentSurahNum + 1); }
function playPrevSurah() { if (currentSurahNum > 1) loadReciterSurah(currentSurahNum - 1); }
function loadReciterSurah(num) {
    currentSurahNum = num;
    let fileUrl, key;
    if (currentReciter.isExtra) {
        fileUrl = `https://cdn.islamic.network/quran/audio-surah/128/${currentReciter.id}/${num}.mp3`;
        key = `extra_${currentReciter.id}`;
    } else {
        fileUrl = currentReciter.baseUrl + currentReciter.pattern(num);
        key = currentReciter.id;
    }
    playTrack(fileUrl, `سورة ${surahNames[num - 1]}`, currentReciter.name, num, key);
}
function handleVerseClick() { document.getElementById('spiritual-tafsir-modal').style.display = 'flex'; }
function closeSpiritualTafsirModal() { document.getElementById('spiritual-tafsir-modal').style.display = 'none'; }
