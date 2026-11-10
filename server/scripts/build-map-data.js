// server/scripts/build-map-data.js
const fs = require('fs');

// 81 Provinces of Turkey with standard plates, names, regions
// Standard 7 Geographical Regions:
// Marmara, Ege, Akdeniz, Ic_Anadolu, Karadeniz, Dogu_Anadolu, Guneydogu_Anadolu

const PROVINCE_NEIGHBORS = {
  1: [31, 80, 46, 38, 51, 33], // Adana: Hatay, Osmaniye, K.Maraş, Kayseri, Niğde, Mersin
  2: [44, 21, 63, 27, 46], // Adıyaman: Malatya, Diyarbakır, Şanlıurfa, Gaziantep, K.Maraş
  3: [26, 42, 32, 15, 20, 64, 43], // Afyonkarahisar: Eskişehir, Konya, Isparta, Burdur, Denizli, Uşak, Kütahya
  4: [76, 36, 25, 49, 13, 65], // Ağrı: Iğdır, Kars, Erzurum, Muş, Bitlis, Van
  5: [55, 19, 66, 60], // Amasya: Samsun, Çorum, Yozgat, Tokat
  6: [18, 14, 26, 42, 68, 40, 71], // Ankara: Çankırı, Bolu, Eskişehir, Konya, Aksaray, Kırşehir, Kırıkkale
  7: [33, 70, 42, 32, 15, 48], // Antalya: Mersin, Karaman, Konya, Isparta, Burdur, Muğla
  8: [53, 25, 75], // Artvin: Rize, Erzurum, Ardahan
  9: [48, 20, 45, 35], // Aydın: Muğla, Denizli, Manisa, İzmir
  10: [17, 16, 45, 35, 43], // Balıkesir: Çanakkale, Bursa, Manisa, İzmir, Kütahya
  11: [54, 14, 26, 43, 16], // Bilecik: Sakarya, Bolu, Eskişehir, Kütahya, Bursa
  12: [49, 21, 23, 62, 24, 25], // Bingöl: Muş, Diyarbakır, Elazığ, Tunceli, Erzincan, Erzurum
  13: [56, 72, 49, 4, 65], // Bitlis: Siirt, Batman, Muş, Ağrı, Van
  14: [81, 54, 11, 26, 6, 18, 78, 67], // Bolu: Düzce, Sakarya, Bilecik, Eskişehir, Ankara, Çankırı, Karabük, Zonguldak
  15: [7, 48, 20, 3, 32], // Burdur: Antalya, Muğla, Denizli, Afyon, Isparta
  16: [10, 77, 41, 54, 11, 43], // Bursa: Balıkesir, Yalova, Kocaeli, Sakarya, Bilecik, Kütahya
  17: [22, 59, 10], // Çanakkale: Edirne, Tekirdağ, Balıkesir
  18: [6, 14, 78, 37, 19, 71], // Çankırı: Ankara, Bolu, Karabük, Kastamonu, Çorum, Kırıkkale
  19: [18, 37, 57, 55, 5, 66, 71], // Çorum: Çankırı, Kastamonu, Sinop, Samsun, Amasya, Yozgat, Kırıkkale
  20: [48, 9, 45, 64, 3, 15], // Denizli: Muğla, Aydın, Manisa, Uşak, Afyon, Burdur
  21: [72, 47, 63, 2, 44, 23, 12, 49], // Diyarbakır: Batman, Mardin, Ş.Urfa, Adıyaman, Malatya, Elazığ, Bingöl, Muş
  22: [39, 59, 17], // Edirne: Kırklareli, Tekirdağ, Çanakkale
  23: [62, 12, 21, 2, 44, 24], // Elazığ: Tunceli, Bingöl, Diyarbakır, Adıyaman, Malatya, Erzincan
  24: [29, 28, 58, 44, 23, 62, 12, 25, 69], // Erzincan: Gümüşhane, Giresun, Sivas, Malatya, Elazığ, Tunceli, Bingöl, Erzurum, Bayburt
  25: [8, 75, 36, 4, 49, 12, 24, 69, 53], // Erzurum: Artvin, Ardahan, Kars, Ağrı, Muş, Bingöl, Erzincan, Bayburt, Rize
  26: [14, 11, 43, 3, 42, 6], // Eskişehir: Bolu, Bilecik, Kütahya, Afyon, Konya, Ankara
  27: [63, 2, 46, 80, 79, 31], // Gaziantep: Ş.Urfa, Adıyaman, K.Maraş, Osmaniye, Kilis, Hatay
  28: [52, 58, 24, 29, 61], // Giresun: Ordu, Sivas, Erzincan, Gümüşhane, Trabzon
  29: [61, 28, 24, 69], // Gümüşhane: Trabzon, Giresun, Erzincan, Bayburt
  30: [65, 73], // Hakkari: Van, Şırnak
  31: [79, 27, 80, 1], // Hatay: Kilis, Gaziantep, Osmaniye, Adana
  32: [42, 7, 15, 3], // Isparta: Konya, Antalya, Burdur, Afyon
  33: [1, 51, 42, 70, 7], // Mersin: Adana, Niğde, Konya, Karaman, Antalya
  34: [59, 39, 41], // İstanbul: Tekirdağ, Kırklareli, Kocaeli
  35: [9, 45, 10], // İzmir: Aydın, Manisa, Balıkesir
  36: [75, 25, 4, 76], // Kars: Ardahan, Erzurum, Ağrı, Iğdır
  37: [74, 78, 18, 19, 57], // Kastamonu: Bartın, Karabük, Çankırı, Çorum, Sinop
  38: [58, 46, 1, 51, 50, 66], // Kayseri: Sivas, K.Maraş, Adana, Niğde, Nevşehir, Yozgat
  39: [22, 59, 34], // Kırklareli: Edirne, Tekirdağ, İstanbul
  40: [6, 71, 66, 50, 68], // Kırşehir: Ankara, Kırıkkale, Yozgat, Nevşehir, Aksaray
  41: [34, 77, 16, 54], // Kocaeli: İstanbul, Yalova, Bursa, Sakarya
  42: [33, 70, 7, 32, 3, 26, 6, 68, 51], // Konya: Mersin, Karaman, Antalya, Isparta, Afyon, Eskişehir, Ankara, Aksaray, Niğde
  43: [11, 26, 3, 64, 45, 10, 16], // Kütahya: Bilecik, Eskişehir, Afyon, Uşak, Manisa, Balıkesir, Bursa
  44: [58, 24, 23, 21, 2, 46], // Malatya: Sivas, Erzincan, Elazığ, Diyarbakır, Adıyaman, K.Maraş
  45: [35, 10, 43, 64, 20, 9], // Manisa: İzmir, Balıkesir, Kütahya, Uşak, Denizli, Aydın
  46: [44, 58, 38, 1, 80, 27, 2], // Kahramanmaraş: Malatya, Sivas, Kayseri, Adana, Osmaniye, Gaziantep, Adıyaman
  47: [73, 72, 21, 63], // Mardin: Şırnak, Batman, Diyarbakır, Şanlıurfa
  48: [7, 15, 20, 9], // Muğla: Antalya, Burdur, Denizli, Aydın
  49: [13, 72, 21, 12, 25, 4], // Muş: Bitlis, Batman, Diyarbakır, Bingöl, Erzurum, Ağrı
  50: [38, 66, 40, 68, 51], // Nevşehir: Kayseri, Yozgat, Kırşehir, Aksaray, Niğde
  51: [1, 38, 50, 68, 42, 33], // Niğde: Adana, Kayseri, Nevşehir, Aksaray, Konya, Mersin
  52: [55, 60, 58, 28], // Ordu: Samsun, Tokat, Sivas, Giresun
  53: [61, 69, 25, 8], // Rize: Trabzon, Bayburt, Erzurum, Artvin
  54: [41, 16, 11, 14, 81], // Sakarya: Kocaeli, Bursa, Bilecik, Bolu, Düzce
  55: [57, 19, 5, 60, 52], // Samsun: Sinop, Çorum, Amasya, Tokat, Ordu
  56: [73, 65, 13, 72], // Siirt: Şırnak, Van, Bitlis, Batman
  57: [37, 19, 55], // Sinop: Kastamonu, Çorum, Samsun
  58: [52, 28, 24, 44, 46, 38, 66, 60], // Sivas: Ordu, Giresun, Erzincan, Malatya, K.Maraş, Kayseri, Yozgat, Tokat
  59: [22, 39, 34, 17], // Tekirdağ: Edirne, Kırklareli, İstanbul, Çanakkale
  60: [55, 52, 58, 66, 5], // Tokat: Samsun, Ordu, Sivas, Yozgat, Amasya
  61: [28, 29, 69, 53], // Trabzon: Giresun, Gümüşhane, Bayburt, Rize
  62: [24, 12, 23], // Tunceli: Erzincan, Bingöl, Elazığ
  63: [47, 21, 2, 27], // Şanlıurfa: Mardin, Diyarbakır, Adıyaman, Gaziantep
  64: [45, 43, 3, 20], // Uşak: Manisa, Kütahya, Afyon, Denizli
  65: [4, 13, 56, 73, 30], // Van: Ağrı, Bitlis, Siirt, Şırnak, Hakkari
  66: [19, 5, 60, 58, 38, 50, 40, 71], // Yozgat: Çorum, Amasya, Tokat, Sivas, Kayseri, Nevşehir, Kırşehir, Kırıkkale
  67: [81, 14, 78, 74], // Zonguldak: Düzce, Bolu, Karabük, Bartın
  68: [42, 51, 50, 40, 6], // Aksaray: Konya, Niğde, Nevşehir, Kırşehir, Ankara
  69: [61, 29, 24, 25, 53], // Bayburt: Trabzon, Gümüşhane, Erzincan, Erzurum, Rize
  70: [33, 42, 7], // Karaman: Mersin, Konya, Antalya
  71: [6, 18, 19, 66, 40], // Kırıkkale: Ankara, Çankırı, Çorum, Yozgat, Kırşehir
  72: [73, 56, 13, 49, 21, 47], // Batman: Şırnak, Siirt, Bitlis, Muş, Diyarbakır, Mardin
  73: [30, 65, 56, 72, 47], // Şırnak: Hakkari, Van, Siirt, Batman, Mardin
  74: [67, 78, 37], // Bartın: Zonguldak, Karabük, Kastamonu
  75: [8, 25, 36], // Ardahan: Artvin, Erzurum, Kars
  76: [36, 4], // Iğdır: Kars, Ağrı
  77: [16, 41], // Yalova: Bursa, Kocaeli
  78: [74, 67, 14, 18, 37], // Karabük: Bartın, Zonguldak, Bolu, Çankırı, Kastamonu
  79: [27, 31], // Kilis: Gaziantep, Hatay
  80: [31, 27, 46, 1], // Osmaniye: Hatay, Gaziantep, K.Maraş, Adana
  81: [54, 14, 67] // Düzce: Sakarya, Bolu, Zonguldak
};

// Symmetrize adjacency automatically
for (const [pStr, neighbors] of Object.entries(PROVINCE_NEIGHBORS)) {
  const p = parseInt(pStr, 10);
  for (const n of neighbors) {
    if (!PROVINCE_NEIGHBORS[n]) PROVINCE_NEIGHBORS[n] = [];
    if (!PROVINCE_NEIGHBORS[n].includes(p)) {
      PROVINCE_NEIGHBORS[n].push(p);
      console.log(`Added missing symmetric edge: ${n} <-> ${p}`);
    }
  }
}

// Check connectivity of 81 provinces
const visited = new Set();
const queue = [1];
visited.add(1);
while (queue.length > 0) {
  const cur = queue.shift();
  for (const n of PROVINCE_NEIGHBORS[cur]) {
    if (!visited.has(n)) {
      visited.add(n);
      queue.push(n);
    }
  }
}

console.log(`Province connectivity check: reached ${visited.size} of 81 provinces.`);
if (visited.size !== 81) {
  throw new Error('Graph is disconnected at province level!');
}

// 7 Regions (Level 1)
const LEVEL_1_REGIONS = {
  marmara: {
    id: 'marmara',
    name: 'Marmara Bölgesi',
    provinces: [10, 11, 16, 17, 22, 34, 39, 41, 54, 59, 77] // 11 provinces
  },
  ege: {
    id: 'ege',
    name: 'Ege Bölgesi',
    provinces: [9, 20, 35, 43, 45, 48, 64, 3] // 8 provinces
  },
  akdeniz: {
    id: 'akdeniz',
    name: 'Akdeniz Bölgesi',
    provinces: [1, 7, 15, 31, 32, 33, 46, 80] // 8 provinces
  },
  ic_anadolu: {
    id: 'ic_anadolu',
    name: 'İç Anadolu Bölgesi',
    provinces: [6, 18, 26, 38, 40, 42, 50, 51, 58, 66, 68, 70, 71] // 13 provinces
  },
  karadeniz: {
    id: 'karadeniz',
    name: 'Karadeniz Bölgesi',
    provinces: [5, 8, 14, 19, 28, 29, 37, 52, 53, 55, 57, 60, 61, 67, 69, 74, 78, 81] // 18 provinces
  },
  dogu_anadolu: {
    id: 'dogu_anadolu',
    name: 'Doğu Anadolu Bölgesi',
    provinces: [4, 12, 13, 23, 24, 25, 30, 36, 44, 49, 62, 65, 75, 76] // 14 provinces
  },
  guneydogu_anadolu: {
    id: 'guneydogu_anadolu',
    name: 'Güneydoğu Anadolu Bölgesi',
    provinces: [2, 21, 27, 47, 56, 63, 72, 73, 79] // 9 provinces
  }
};

// Verify all 81 provinces in exactly 1 Region
const allProvinces = [];
for (const [k, r] of Object.entries(LEVEL_1_REGIONS)) {
  allProvinces.push(...r.provinces);
}
console.log('Total provinces in regions:', allProvinces.length, 'Unique:', new Set(allProvinces).size);
if (allProvinces.length !== 81 || new Set(allProvinces).size !== 81) {
  throw new Error('Level 1 regions do not partition 81 provinces exactly!');
}

// Level 2 Pieces (~21 pieces, each nested in one Level 1 region)
// Marmara (3 pieces):
// - l2_trakya: Edirne (22), Kırklareli (39), Tekirdağ (59), Çanakkale (17)
// - l2_guney_marmara: Balıkesir (10), Bursa (16), Yalova (77), Bilecik (11)
// - l2_dogu_marmara: İstanbul (34), Kocaeli (41), Sakarya (54)
// Ege (3 pieces):
// - l2_kuzey_ege: İzmir (35), Manisa (45)
// - l2_guney_ege: Aydın (9), Muğla (48), Denizli (20)
// - l2_ic_ege: Kütahya (43), Uşak (64), Afyonkarahisar (3)
// Akdeniz (3 pieces):
// - l2_bati_akdeniz: Antalya (7), Burdur (15), Isparta (32)
// - l2_orta_akdeniz: Mersin (33), Adana (1)
// - l2_dogu_akdeniz: Hatay (31), Osmaniye (80), Kahramanmaraş (46)
// İç Anadolu (4 pieces):
// - l2_baskent_cevre: Ankara (6), Eskişehir (26), Kırıkkale (71), Çankırı (18)
// - l2_orta_anadolu: Konya (42), Karaman (70), Aksaray (68)
// - l2_kapadokya: Nevşehir (50), Niğde (51), Kırşehir (40), Yozgat (66)
// - l2_yukari_kizilirmak: Kayseri (38), Sivas (58)
// Karadeniz (4 pieces):
// - l2_bati_karadeniz: Bolu (14), Düzce (81), Zonguldak (67), Bartın (74), Karabük (78), Kastamonu (37)
// - l2_orta_karadeniz: Sinop (57), Samsun (55), Amasya (5), Çorum (19)
// - l2_yesilirmak: Ordu (52), Giresun (28), Tokat (60)
// - l2_dogu_karadeniz: Trabzon (61), Rize (53), Artvin (8), Gümüşhane (29), Bayburt (69)
// Doğu Anadolu (3 pieces):
// - l2_yukari_firat: Malatya (44), Elazığ (23), Tunceli (62), Erzincan (24), Bingöl (12)
// - l2_erzurum_kars: Erzurum (25), Kars (36), Ardahan (75), Ağrı (4), Iğdır (76)
// - l2_yukari_murat_van: Van (65), Muş (49), Bitlis (13), Hakkari (30)
// Güneydoğu Anadolu (2 pieces):
// - l2_orta_firat: Gaziantep (27), Adıyaman (2), Şanlıurfa (63), Kilis (79)
// - l2_dicle: Diyarbakır (21), Batman (72), Mardin (47), Siirt (56), Şırnak (73)

const LEVEL_2_PIECES = {
  // Marmara
  l2_trakya: { id: 'l2_trakya', name: 'Trakya & Çanakkale', region: 'marmara', provinces: [22, 39, 59, 17] },
  l2_guney_marmara: { id: 'l2_guney_marmara', name: 'Güney Marmara', region: 'marmara', provinces: [10, 16, 77, 11] },
  l2_dogu_marmara: { id: 'l2_dogu_marmara', name: 'İstanbul & Doğu Marmara', region: 'marmara', provinces: [34, 41, 54] },
  // Ege
  l2_kuzey_ege: { id: 'l2_kuzey_ege', name: 'Kuzey Ege', region: 'ege', provinces: [35, 45] },
  l2_guney_ege: { id: 'l2_guney_ege', name: 'Güney Ege', region: 'ege', provinces: [9, 48, 20] },
  l2_ic_ege: { id: 'l2_ic_ege', name: 'İç Ege', region: 'ege', provinces: [43, 64, 3] },
  // Akdeniz
  l2_bati_akdeniz: { id: 'l2_bati_akdeniz', name: 'Batı Akdeniz (Teke & Göller)', region: 'akdeniz', provinces: [7, 15, 32] },
  l2_orta_akdeniz: { id: 'l2_orta_akdeniz', name: 'Çukurova & Taşeli', region: 'akdeniz', provinces: [33, 1] },
  l2_dogu_akdeniz: { id: 'l2_dogu_akdeniz', name: 'Doğu Akdeniz (Amanos)', region: 'akdeniz', provinces: [31, 80, 46] },
  // İç Anadolu
  l2_baskent_cevre: { id: 'l2_baskent_cevre', name: 'Başkent & Yukarı Sakarya', region: 'ic_anadolu', provinces: [6, 26, 71, 18] },
  l2_orta_anadolu: { id: 'l2_orta_anadolu', name: 'Konya Kapalı Havzası', region: 'ic_anadolu', provinces: [42, 70, 68] },
  l2_kapadokya: { id: 'l2_kapadokya', name: 'Kapadokya & Bozok', region: 'ic_anadolu', provinces: [50, 51, 40, 66] },
  l2_yukari_kizilirmak: { id: 'l2_yukari_kizilirmak', name: 'Yukarı Kızılırmak', region: 'ic_anadolu', provinces: [38, 58] },
  // Karadeniz
  l2_bati_karadeniz: { id: 'l2_bati_karadeniz', name: 'Batı Karadeniz', region: 'karadeniz', provinces: [14, 81, 67, 74, 78, 37] },
  l2_orta_karadeniz: { id: 'l2_orta_karadeniz', name: 'Orta Karadeniz Kıyısı', region: 'karadeniz', provinces: [57, 55, 5, 19] },
  l2_yesilirmak: { id: 'l2_yesilirmak', name: 'Yeşilırmak & Doğu Kıyı', region: 'karadeniz', provinces: [52, 28, 60] },
  l2_dogu_karadeniz: { id: 'l2_dogu_karadeniz', name: 'Doğu Karadeniz Dağları', region: 'karadeniz', provinces: [61, 53, 8, 29, 69] },
  // Doğu Anadolu
  l2_yukari_firat: { id: 'l2_yukari_firat', name: 'Yukarı Fırat', region: 'dogu_anadolu', provinces: [44, 23, 62, 24, 12] },
  l2_erzurum_kars: { id: 'l2_erzurum_kars', name: 'Erzurum-Kars Platosu', region: 'dogu_anadolu', provinces: [25, 36, 75, 4, 76] },
  l2_yukari_murat_van: { id: 'l2_yukari_murat_van', name: 'Van Gölü Havzası & Hakkari', region: 'dogu_anadolu', provinces: [65, 49, 13, 30] },
  // Güneydoğu Anadolu
  l2_orta_firat: { id: 'l2_orta_firat', name: 'Orta Fırat', region: 'guneydogu_anadolu', provinces: [27, 2, 63, 79] },
  l2_dicle: { id: 'l2_dicle', name: 'Dicle Havzası', region: 'guneydogu_anadolu', provinces: [21, 72, 47, 56, 73] }
};

// Level 3 Pieces (~33 pieces, each nested in one Level 2 piece)
const LEVEL_3_PIECES = {
  // From l2_trakya
  l3_edirne_kirklareli: { id: 'l3_edirne_kirklareli', name: 'Edirne & Kırklareli', l2: 'l2_trakya', provinces: [22, 39] },
  l3_tekirdag_canakkale: { id: 'l3_tekirdag_canakkale', name: 'Tekirdağ & Çanakkale', l2: 'l2_trakya', provinces: [59, 17] },
  // From l2_guney_marmara
  l3_balikesir: { id: 'l3_balikesir', name: 'Balıkesir', l2: 'l2_guney_marmara', provinces: [10] },
  l3_bursa_yalova_bilecik: { id: 'l3_bursa_yalova_bilecik', name: 'Bursa · Yalova · Bilecik', l2: 'l2_guney_marmara', provinces: [16, 77, 11] },
  // From l2_dogu_marmara
  l3_istanbul: { id: 'l3_istanbul', name: 'İstanbul', l2: 'l2_dogu_marmara', provinces: [34] },
  l3_kocaeli_sakarya: { id: 'l3_kocaeli_sakarya', name: 'Kocaeli & Sakarya', l2: 'l2_dogu_marmara', provinces: [41, 54] },

  // From l2_kuzey_ege
  l3_izmir: { id: 'l3_izmir', name: 'İzmir', l2: 'l2_kuzey_ege', provinces: [35] },
  l3_manisa: { id: 'l3_manisa', name: 'Manisa', l2: 'l2_kuzey_ege', provinces: [45] },
  // From l2_guney_ege
  l3_aydin_mugla: { id: 'l3_aydin_mugla', name: 'Aydın & Muğla', l2: 'l2_guney_ege', provinces: [9, 48] },
  l3_denizli: { id: 'l3_denizli', name: 'Denizli', l2: 'l2_guney_ege', provinces: [20] },
  // From l2_ic_ege
  l3_kutahya_usak: { id: 'l3_kutahya_usak', name: 'Kütahya & Uşak', l2: 'l2_ic_ege', provinces: [43, 64] },
  l3_afyon: { id: 'l3_afyon', name: 'Afyonkarahisar', l2: 'l2_ic_ege', provinces: [3] },

  // From l2_bati_akdeniz
  l3_antalya: { id: 'l3_antalya', name: 'Antalya', l2: 'l2_bati_akdeniz', provinces: [7] },
  l3_göller: { id: 'l3_göller', name: 'Burdur & Isparta', l2: 'l2_bati_akdeniz', provinces: [15, 32] },
  // From l2_orta_akdeniz
  l3_mersin: { id: 'l3_mersin', name: 'Mersin', l2: 'l2_orta_akdeniz', provinces: [33] },
  l3_adana: { id: 'l3_adana', name: 'Adana', l2: 'l2_orta_akdeniz', provinces: [1] },
  // From l2_dogu_akdeniz
  l3_hatay_osmaniye: { id: 'l3_hatay_osmaniye', name: 'Hatay & Osmaniye', l2: 'l2_dogu_akdeniz', provinces: [31, 80] },
  l3_kahramanmaras: { id: 'l3_kahramanmaras', name: 'Kahramanmaraş', l2: 'l2_dogu_akdeniz', provinces: [46] },

  // From l2_baskent_cevre
  l3_ankara_eskisehir: { id: 'l3_ankara_eskisehir', name: 'Ankara & Eskişehir', l2: 'l2_baskent_cevre', provinces: [6, 26] },
  l3_cankiri_kirikkale: { id: 'l3_cankiri_kirikkale', name: 'Çankırı & Kırıkkale', l2: 'l2_baskent_cevre', provinces: [18, 71] },
  // From l2_orta_anadolu
  l3_konya_karaman: { id: 'l3_konya_karaman', name: 'Konya & Karaman', l2: 'l2_orta_anadolu', provinces: [42, 70] },
  l3_aksaray: { id: 'l3_aksaray', name: 'Aksaray', l2: 'l2_orta_anadolu', provinces: [68] },
  // From l2_kapadokya
  l3_nevsehir_nigde: { id: 'l3_nevsehir_nigde', name: 'Nevşehir & Niğde', l2: 'l2_kapadokya', provinces: [50, 51] },
  l3_kirsehir_yozgat: { id: 'l3_kirsehir_yozgat', name: 'Kırşehir & Yozgat', l2: 'l2_kapadokya', provinces: [40, 66] },
  // From l2_yukari_kizilirmak
  l3_kayseri: { id: 'l3_kayseri', name: 'Kayseri', l2: 'l2_yukari_kizilirmak', provinces: [38] },
  l3_sivas: { id: 'l3_sivas', name: 'Sivas', l2: 'l2_yukari_kizilirmak', provinces: [58] },

  // From l2_bati_karadeniz
  l3_bolu_duzce_zonguldak: { id: 'l3_bolu_duzce_zonguldak', name: 'Bolu · Düzce · Zonguldak', l2: 'l2_bati_karadeniz', provinces: [14, 81, 67] },
  l3_bartin_karabuk_kastamonu: { id: 'l3_bartin_karabuk_kastamonu', name: 'Bartın · Karabük · Kastamonu', l2: 'l2_bati_karadeniz', provinces: [74, 78, 37] },
  // From l2_orta_karadeniz
  l3_samsun_sinop: { id: 'l3_samsun_sinop', name: 'Samsun & Sinop', l2: 'l2_orta_karadeniz', provinces: [55, 57] },
  l3_corum_amasya: { id: 'l3_corum_amasya', name: 'Çorum & Amasya', l2: 'l2_orta_karadeniz', provinces: [19, 5] },
  // From l2_yesilirmak
  l3_ordu_giresun: { id: 'l3_ordu_giresun', name: 'Ordu & Giresun', l2: 'l2_yesilirmak', provinces: [52, 28] },
  l3_tokat: { id: 'l3_tokat', name: 'Tokat', l2: 'l2_yesilirmak', provinces: [60] },
  // From l2_dogu_karadeniz
  l3_trabzon_gumushane_bayburt: { id: 'l3_trabzon_gumushane_bayburt', name: 'Trabzon · Gümüşhane · Bayburt', l2: 'l2_dogu_karadeniz', provinces: [61, 29, 69] },
  l3_rize_artvin: { id: 'l3_rize_artvin', name: 'Rize & Artvin', l2: 'l2_dogu_karadeniz', provinces: [53, 8] },

  // From l2_yukari_firat
  l3_malatya_elazig: { id: 'l3_malatya_elazig', name: 'Malatya & Elazığ', l2: 'l2_yukari_firat', provinces: [44, 23] },
  l3_erzincan_tunceli_bingol: { id: 'l3_erzincan_tunceli_bingol', name: 'Erzincan · Tunceli · Bingöl', l2: 'l2_yukari_firat', provinces: [24, 62, 12] },
  // From l2_erzurum_kars
  l3_erzurum: { id: 'l3_erzurum', name: 'Erzurum', l2: 'l2_erzurum_kars', provinces: [25] },
  l3_kars_ardahan_igdir: { id: 'l3_kars_ardahan_igdir', name: 'Kars · Ardahan · Iğdır', l2: 'l2_erzurum_kars', provinces: [36, 75, 76] },
  l3_agri: { id: 'l3_agri', name: 'Ağrı', l2: 'l2_erzurum_kars', provinces: [4] },
  // From l2_yukari_murat_van
  l3_van_hakkari: { id: 'l3_van_hakkari', name: 'Van & Hakkari', l2: 'l2_yukari_murat_van', provinces: [65, 30] },
  l3_mus_bitlis: { id: 'l3_mus_bitlis', name: 'Muş & Bitlis', l2: 'l2_yukari_murat_van', provinces: [49, 13] },

  // From l2_orta_firat
  l3_gaziantep_kilis: { id: 'l3_gaziantep_kilis', name: 'Gaziantep & Kilis', l2: 'l2_orta_firat', provinces: [27, 79] },
  l3_sanliurfa_adiyaman: { id: 'l3_sanliurfa_adiyaman', name: 'Şanlıurfa & Adıyaman', l2: 'l2_orta_firat', provinces: [63, 2] },
  // From l2_dicle
  l3_diyarbakir_batman: { id: 'l3_diyarbakir_batman', name: 'Diyarbakır & Batman', l2: 'l2_dicle', provinces: [21, 72] },
  l3_mardin_siirt_sirnak: { id: 'l3_mardin_siirt_sirnak', name: 'Mardin · Siirt · Şırnak', l2: 'l2_dicle', provinces: [47, 56, 73] }
};

// Level 4 Pieces: 81 individual provinces
const rawProvinces = JSON.parse(fs.readFileSync('server/data/provinces-raw.json'));
const PROVINCES_81 = {};

for (let p = 1; p <= 81; p++) {
  const matches = rawProvinces.provinces.filter(x => x.plate === p);
  const combinedPaths = matches.flatMap(m => m.paths);
  const name = matches[0].name.replace(/ \(.*\)/, '');
  PROVINCES_81[p] = {
    id: 'tr_' + String(p).padStart(2, '0'),
    plate: p,
    name,
    paths: combinedPaths
  };
}

// Validation function for piece internally connected
function verifyInternalConnectivity(pieceName, provincesList) {
  if (provincesList.length <= 1) return true;
  const pSet = new Set(provincesList);
  const v = new Set([provincesList[0]]);
  const q = [provincesList[0]];
  while (q.length > 0) {
    const cur = q.shift();
    for (const n of (PROVINCE_NEIGHBORS[cur] || [])) {
      if (pSet.has(n) && !v.has(n)) {
        v.add(n);
        q.push(n);
      }
    }
  }
  if (v.size !== provincesList.length) {
    console.error(`ERROR: Piece ${pieceName} is internally disconnected!`, provincesList, 'reached only:', [...v]);
    return false;
  }
  return true;
}

// Function to calculate adjacency between pieces in any partition
function computePieceAdjacency(piecesObj) {
  const pieceIds = Object.keys(piecesObj);
  const adj = {};
  for (const id of pieceIds) adj[id] = [];

  for (let i = 0; i < pieceIds.length; i++) {
    const idA = pieceIds[i];
    const setA = new Set(piecesObj[idA].provinces);
    for (let j = i + 1; j < pieceIds.length; j++) {
      const idB = pieceIds[j];
      const provsB = piecesObj[idB].provinces;
      let isNeighbor = false;
      for (const pB of provsB) {
        for (const n of PROVINCE_NEIGHBORS[pB]) {
          if (setA.has(n)) {
            isNeighbor = true;
            break;
          }
        }
        if (isNeighbor) break;
      }
      if (isNeighbor) {
        adj[idA].push(idB);
        adj[idB].push(idA);
      }
    }
  }

  // Verify connectivity of whole map at this level
  const visited = new Set([pieceIds[0]]);
  const q = [pieceIds[0]];
  while (q.length > 0) {
    const cur = q.shift();
    for (const n of adj[cur]) {
      if (!visited.has(n)) {
        visited.add(n);
        q.push(n);
      }
    }
  }

  if (visited.size !== pieceIds.length) {
    throw new Error(`Graph disconnected at level! Reached ${visited.size} of ${pieceIds.length}`);
  }

  return adj;
}

// Validate Level 2
console.log('--- Validating Level 2 ---');
let l2Provs = [];
for (const [id, piece] of Object.entries(LEVEL_2_PIECES)) {
  l2Provs.push(...piece.provinces);
  verifyInternalConnectivity(id, piece.provinces);
}
console.log(`L2 total provinces: ${l2Provs.length}, Unique: ${new Set(l2Provs).size}`);
if (l2Provs.length !== 81 || new Set(l2Provs).size !== 81) {
  throw new Error('Level 2 does not partition 81 provinces exactly!');
}
const l2Adj = computePieceAdjacency(LEVEL_2_PIECES);
console.log(`Level 2 has ${Object.keys(LEVEL_2_PIECES).length} pieces, graph is fully connected.`);

// Validate Level 3
console.log('--- Validating Level 3 ---');
let l3Provs = [];
for (const [id, piece] of Object.entries(LEVEL_3_PIECES)) {
  l3Provs.push(...piece.provinces);
  verifyInternalConnectivity(id, piece.provinces);
}
console.log(`L3 total provinces: ${l3Provs.length}, Unique: ${new Set(l3Provs).size}`);
if (l3Provs.length !== 81 || new Set(l3Provs).size !== 81) {
  throw new Error('Level 3 does not partition 81 provinces exactly!');
}
const l3Adj = computePieceAdjacency(LEVEL_3_PIECES);
console.log(`Level 3 has ${Object.keys(LEVEL_3_PIECES).length} pieces, graph is fully connected.`);

// Validate Level 1
console.log('--- Validating Level 1 ---');
for (const [id, piece] of Object.entries(LEVEL_1_REGIONS)) {
  verifyInternalConnectivity(id, piece.provinces);
}
const l1Adj = computePieceAdjacency(LEVEL_1_REGIONS);
console.log(`Level 1 has ${Object.keys(LEVEL_1_REGIONS).length} regions, graph is fully connected.`);

// Validate Level 4 (81 provinces)
const l4Pieces = {};
for (let p = 1; p <= 81; p++) {
  l4Pieces['tr_' + String(p).padStart(2, '0')] = {
    id: 'tr_' + String(p).padStart(2, '0'),
    name: PROVINCES_81[p].name,
    provinces: [p]
  };
}
const l4Adj = computePieceAdjacency(l4Pieces);
console.log(`Level 4 has 81 provinces, graph is fully connected.`);

// Compute visual bounding boxes and centroids for each province
function computeCentroid(paths) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const path of paths) {
    const numbers = [...path.matchAll(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g)].map(m => parseFloat(m[0]));
    for (let i = 0; i < numbers.length - 1; i += 2) {
      const x = numbers[i];
      const y = numbers[i + 1];
      if (!isNaN(x) && !isNaN(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return {
    minX, maxX, minY, maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

for (let p = 1; p <= 81; p++) {
  PROVINCES_81[p].bounds = computeCentroid(PROVINCES_81[p].paths);
}

// Compute piece centroids for L1, L2, L3
function computeGroupCentroid(provList) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  for (const p of provList) {
    const b = PROVINCES_81[p].bounds;
    if (b.minX < minX) minX = b.minX;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxY > maxY) maxY = b.maxY;
    sumX += b.centerX;
    sumY += b.centerY;
  }
  return {
    minX, maxX, minY, maxY,
    centerX: sumX / provList.length,
    centerY: sumY / provList.length
  };
}

for (const [id, piece] of Object.entries(LEVEL_1_REGIONS)) {
  piece.bounds = computeGroupCentroid(piece.provinces);
}
for (const [id, piece] of Object.entries(LEVEL_2_PIECES)) {
  piece.bounds = computeGroupCentroid(piece.provinces);
}
for (const [id, piece] of Object.entries(LEVEL_3_PIECES)) {
  piece.bounds = computeGroupCentroid(piece.provinces);
}

// Export clean map bundle
const mapBundle = {
  viewBox: rawProvinces.viewBox,
  provinces: PROVINCES_81,
  levels: {
    1: {
      type: 'regions',
      description: '7 Coğrafi Bölge (2-3 Oyuncu)',
      pieces: LEVEL_1_REGIONS,
      adjacency: l1Adj
    },
    2: {
      type: 'subregions',
      description: '22 Bölüm (4-5 Oyuncu)',
      pieces: LEVEL_2_PIECES,
      adjacency: l2Adj
    },
    3: {
      type: 'county_groups',
      description: '44 İl Grubu (6-7 Oyuncu)',
      pieces: LEVEL_3_PIECES,
      adjacency: l3Adj
    },
    4: {
      type: 'provinces',
      description: '81 İl Tek Tek (8-10 Oyuncu)',
      pieces: l4Pieces,
      adjacency: l4Adj
    }
  }
};

fs.writeFileSync('shared/mapData.json', JSON.stringify(mapBundle, null, 2));
console.log('Successfully wrote shared/mapData.json! File size:', fs.statSync('shared/mapData.json').size);
