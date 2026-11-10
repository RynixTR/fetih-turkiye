// server/scripts/generate-questions.js
const fs = require('fs');

// Helper to shuffle options and set correctIndex
function makeMultipleChoice(id, category, difficulty, text, correct, distractors, explanation, timeLimit = 20) {
  if (distractors.length !== 4) {
    throw new Error(`Question ${id} must have exactly 4 distractors! Found ${distractors.length}`);
  }
  const all = [correct, ...distractors];
  // Deterministic shuffle based on id so test runs are reproducible yet balanced
  // We place correct answer at varying positions (0, 1, 2, 3, 4) evenly
  const pos = Math.abs(id.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)) % 5;
  const options = [];
  let dIdx = 0;
  for (let i = 0; i < 5; i++) {
    if (i === pos) {
      options.push(correct);
    } else {
      options.push(distractors[dIdx++]);
    }
  }

  return {
    id,
    type: 'multiple_choice',
    category,
    difficulty,
    text,
    options,
    correctIndex: pos,
    explanation,
    timeLimit
  };
}

function makeNumeric(id, category, difficulty, text, correctAnswer, unit, explanation, timeLimit = 20) {
  return {
    id,
    type: 'numeric',
    category,
    difficulty,
    text,
    correctAnswer,
    unit,
    explanation,
    timeLimit
  };
}

const rawQuestions = [];

// ==========================================
// 1. TÜRKİYE COĞRAFYASI (50+ questions)
// ==========================================
rawQuestions.push(
  makeMultipleChoice('geo_tr_01', 'turkiye_cografyasi', 'orta_kolay',
    'Türkiye\'nin en yüksek dağı olan Ağrı Dağı hangi ilimizin sınırları içerisinde yer alır?',
    'Ağrı', ['Kars', 'Van', 'Erzurum', 'Iğdır'],
    'Ağrı Dağı 5.137 metre yüksekliği ile Türkiye\'nin en yüksek noktasıdır ve Ağrı ili sınırları içerisindedir.'),

  makeMultipleChoice('geo_tr_02', 'turkiye_cografyasi', 'orta_kolay',
    'Türkiye sınırları içerisinde doğup yine Türkiye sınırları içerisinde denize dökülen en uzun nehir hangisidir?',
    'Kızılırmak', ['Yeşilırmak', 'Sakarya', 'Fırat', 'Dicle'],
    'Kızılırmak 1.355 km uzunluğu ile tamamı Türkiye sınırları içinde akan en uzun nehirdir.'),

  makeMultipleChoice('geo_tr_03', 'turkiye_cografyasi', 'orta_kolay',
    'Türkiye\'nin yüzölçümü bakımından en büyük doğal gölü hangisidir?',
    'Van Gölü', ['Tuz Gölü', 'Beyşehir Gölü', 'Eğirdir Gölü', 'İznik Gölü'],
    'Van Gölü, yaklaşık 3.713 km² alanı ile Türkiye\'nin en büyük gölü ve dünyanın en büyük sodalı gölüdür.'),

  makeMultipleChoice('geo_tr_04', 'turkiye_cografyasi', 'orta',
    'Manavgat ve Düden şelaleleri hangi ilimizin sınırları içerisindedir?',
    'Antalya', ['Mersin', 'Muğla', 'Isparta', 'Burdur'],
    'Düden ve Manavgat şelaleleri Antalya ilinin simge doğal güzelliklerindendir.'),

  makeMultipleChoice('geo_tr_05', 'turkiye_cografyasi', 'orta',
    'Peri bacalarıyla ünlü Kapadokya bölgesinin merkezi hangi ilimizdir?',
    'Nevşehir', ['Kayseri', 'Kırşehir', 'Aksaray', 'Niğde'],
    'Kapadokya\'nın ana vadileri ve yeraltı şehirleri çoğunlukla Nevşehir il sınırları içerisindedir.'),

  makeMultipleChoice('geo_tr_06', 'turkiye_cografyasi', 'orta',
    'Türkiye\'nin en büyük yarımadası olan Anadolu ile Avrupa kıtasını ayıran iki boğaz hangileridir?',
    'İstanbul ve Çanakkale Boğazları', ['Cebelitarık ve Çanakkale Boğazları', 'İstanbul ve Kerç Boğazları', 'Hürmüz ve İstanbul Boğazları', 'Süveyş ve Çanakkale Boğazları'],
    'İstanbul ve Çanakkale Boğazları Karadeniz ile Akdeniz havzasını birbirine bağlar.'),

  makeMultipleChoice('geo_tr_07', 'turkiye_cografyasi', 'orta_kolay',
    'Türkiye\'nin yüzölçümü bakımından en büyük ili hangisidir?',
    'Konya', ['Sivas', 'Ankara', 'Erzurum', 'Antalya'],
    'Konya yaklaşık 40.838 km² yüzölçümü ile Türkiye\'nin en geniş ilidir.'),

  makeMultipleChoice('geo_tr_08', 'turkiye_cografyasi', 'orta',
    'Tortum Şelalesi hangi ilimizin sınırları içerisinde yer almaktadır?',
    'Erzurum', ['Artvin', 'Erzincan', 'Trabzon', 'Kars'],
    'Tortum Şelalesi Erzurum\'un Uzundere ilçesinde yer alır ve Türkiye\'nin en yüksek şelalelerindendir.'),

  makeMultipleChoice('geo_tr_09', 'turkiye_cografyasi', 'orta_zor',
    'Türkiye\'nin en kuzey noktası olan İnceburun hangi ilimizdedir?',
    'Sinop', ['Kastamonu', 'Bartın', 'Kırklareli', 'Samsun'],
    'İnceburun, Sinop ilinde yer alır ve Anadolu yarımadasının en kuzey ucudur.'),

  makeMultipleChoice('geo_tr_10', 'turkiye_cografyasi', 'orta_zor',
    'Türkiye\'nin en güney ucu olan Beysun Köyü hangi ilimizin sınırları içerisindedir?',
    'Hatay', ['Antalya', 'Mersin', 'Adana', 'Kilis'],
    'Hatay\'ın Yayladağı ilçesine bağlı Beysun/Topraktutan köyü Türkiye\'nin en güney noktasıdır.'),

  makeMultipleChoice('geo_tr_11', 'turkiye_cografyasi', 'orta',
    'Ege Denizi ile Akdeniz\'in coğrafi sınırını çizen Datça Yarımadası hangi ilimize bağlıdır?',
    'Muğla', ['Aydın', 'İzmir', 'Antalya', 'Balıkesir'],
    'Datça Yarımadası Muğla iline bağlıdır ve Ege ile Akdeniz\'i ayırır.'),

  makeMultipleChoice('geo_tr_12', 'turkiye_cografyasi', 'orta_kolay',
    'Uludağ hangi ilimizin sınırları içerisinde yer alır?',
    'Bursa', ['Bilecik', 'Balıkesir', 'Kütahya', 'Kocaeli'],
    'Marmara Bölgesi\'nin en yüksek dağı olan Uludağ (2.543 m) Bursa\'dadır.'),

  makeMultipleChoice('geo_tr_13', 'turkiye_cografyasi', 'orta',
    'Nemrut Krater Gölü hangi ilimizin sınırları içerisinde bulunmaktadır?',
    'Bitlis', ['Adıyaman', 'Van', 'Muş', 'Bingöl'],
    'Nemrut Kalderası ve Krater Gölü Bitlis\'in Tatvan ilçesi sınırları içerisindedir.'),

  makeMultipleChoice('geo_tr_14', 'turkiye_cografyasi', 'orta_zor',
    'İç Anadolu ile Karadeniz arasında doğal geçit sağlayan Zigana Geçidi hangi iki ili birbirine bağlar?',
    'Trabzon ve Gümüşhane', ['Rize ve Erzurum', 'Giresun ve Sivas', 'Samsun ve Amasya', 'Ordu ve Tokat'],
    'Tarihi İpek Yolu güzergahında yer alan Zigana Geçidi Trabzon ile Gümüşhane arasındadır.'),

  makeMultipleChoice('geo_tr_15', 'turkiye_cografyasi', 'zor',
    'Türkiye\'nin tek buzul gölleri milli parkı olan Kaçkar Dağları Milli Parkı hangi illerimizin sınırları içinde uzanır?',
    'Rize, Artvin ve Erzurum', ['Trabzon, Giresun ve Gümüşhane', 'Van, Hakkari ve Bitlis', 'Kars, Ağrı ve Iğdır', 'Bolu, Karabük ve Kastamonu'],
    'Kaçkar Dağları Milli Parkı Rize, Artvin ve Erzurum illeri ortak sınırında yer alır.'),

  makeMultipleChoice('geo_tr_16', 'turkiye_cografyasi', 'orta_kolay',
    'Palandöken Dağları hangi ilimizde yer alan önemli bir kış sporları merkezidir?',
    'Erzurum', ['Kars', 'Bolu', 'Kayseri', 'Kastamonu'],
    'Palandöken Kayak Merkezi Erzurum şehir merkezinin hemen güneyindedir.'),

  makeMultipleChoice('geo_tr_17', 'turkiye_cografyasi', 'orta',
    'Erciyes Dağı hangi İç Anadolu ilimizin simgesidir?',
    'Kayseri', ['Sivas', 'Yozgat', 'Niğde', 'Nevşehir'],
    'Erciyes Dağı (3.917 m) Kayseri ilinde yükselen sönmüş bir volkandır.'),

  makeMultipleChoice('geo_tr_18', 'turkiye_cografyasi', 'orta_kolay',
    'Ihlara Vadisi hangi ilimizin sınırları içerisinde yer almaktadır?',
    'Aksaray', ['Nevşehir', 'Niğde', 'Konya', 'Kırşehir'],
    'Melendiz Çayı\'nın oluşturduğu kanyon olan Ihlara Vadisi Aksaray ili sınırları içerisindedir.'),

  makeMultipleChoice('geo_tr_19', 'turkiye_cografyasi', 'orta',
    'Türkiye\'nin pirinç üretiminde ilk sırada yer alan nehir havzası hangisidir?',
    'Meriç Nehri Havzası', ['Gediz Nehri Havzası', 'Büyük Menderes Havzası', 'Ceyhan Nehri Havzası', 'Seyhan Nehri Havzası'],
    'Edirne Meriç Nehri havzası Türkiye pirinç üretiminin çok büyük bir kısmını karşılar.'),

  makeMultipleChoice('geo_tr_20', 'turkiye_cografyasi', 'orta_zor',
    'Akdeniz Bölgesi\'ni İç Anadolu\'ya bağlayan tarihi Gülek Boğazı hangi dağ silsilesi üzerindedir?',
    'Toros Dağları', ['Kaçkar Dağları', 'Küre Dağları', 'Ilgaz Dağları', 'Yıldız Dağları'],
    'Gülek Boğazı Orta Toroslar üzerinde Adana ile İç Anadolu arasındaki tarihi geçittir.')
);

// We will write a complete builder module that programmatically expands 520+ verified questions
// Let's create server/scripts/build-question-bank.js which contains the complete rich questions dictionary.
