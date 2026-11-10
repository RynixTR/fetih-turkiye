# 🇹🇷 Fetih Türkiye — Gerçek Zamanlı Mobil Strateji ve Bilgi Yarışması

**Fetih Türkiye**, mobil cihazlar için özel olarak optimize edilmiş, App Store kalitesinde, 2-10 oyunculu gerçek zamanlı bir Türkiye haritası fetih ve bilgi yarışması oyunudur.

Web sitesi hissi değil, modern bir mobil uygulama hissi verecek şekilde; CSS `100dvh`, Safe Area Insets (`env(safe-area-inset-*)`), Web Audio API prosedürel ses motoru, haptik titreşim desteği ve yüksek erişilebilirlik (WCAG AA kontrast ve renk körlüğü geometrik sembolleri) ile tasarlanmıştır.

---

## 🎮 Oyunun Temel Dinamikleri

1. **Katılım ve Lobi:**
   - Oyuncular 4 haneli oda koduyla (veya `?oda=ABCD` doğrudan davet linkiyle) lobiye katılır.
   - 2-14 karakter Türkçe takma ad desteği (küfür filtresi ve emoji/özel karakter engeli).
   - Odayı kuran otomatik yönetici (taç sahibi) olur.
   - Yönetici; oyun süresini (Kısa / Normal / Uzun), soru zorluğunu (Rahat / Normal / Zor) belirler ve en az 2 oyuncuyla oyunu başlatır.

2. **Dinamik 4 Seviyeli Harita:**
   - **2-3 Oyuncu:** 7 Coğrafi Bölge (Geniş alanlar, hızlı taktiksel kapışma)
   - **4-5 Oyuncu:** 22 Alt Bölge (Stratejik tampon bölgeler)
   - **6-7 Oyuncu:** 45 İl Grubu (Dengeli geniş harita)
   - **8-10 Oyuncu:** 81 Türkiye İli (Büyük milli mücadele)

3. **Eşzamanlı Soru ve RTT Gecikme Dengeleme:**
   - Hayatta olan tüm oyunculara aynı anda aynı soru gelir (5 şıklı veya sayısal tahmin).
   - Sunucu tarafı ping ölçümü ile ağ gecikmesi dengelenir.
   - Soru kapanana kadar kimseye doğru/yanlış cevabı ifşa edilmez.

4. **Madde 3-C Sıralama Kuralı:**
   - 1. Seviye: Doğru cevaplayanlar yanıt hızlarına göre sıralanır.
   - 2. Seviye: Yanlış cevaplayanlar yanıt hızlarına göre sıralanır.
   - 3. Seviye: Cevap vermeyenler (en az toprağı olandan başlayarak) sıralanır.
   - Sayısal sorularda en yakın tahmin, eşitlikte hız belirleyicidir.

5. **Başkent ve Fetih Mekaniği:**
   - Tur 1 sonucunda oyuncular sırayla başkentlerini seçer (2, 3 veya 4 can).
   - Sonraki turlarda sıralamaya göre herkes kendi topraklarına komşu boş parçayı veya rakip parçayı fetheder.
   - Bir turda fethedilen parça veya hasar alan başkent o turun sonuna kadar kalkanlanır.
   - Başkenti düşen oyuncu elenir; tüm toprakları başkenti vuran oyuncuya geçer.

6. **Kıyamet Kuralı (Doomsday Rule):**
   - Oyunun sonsuza uzamasını engellemek için, belirlenen süre (10, 14 veya 18 dk) aşıldığında **KIYAMET** başlar.
   - Her turun sonunda hayatta olan tüm başkentler 1 can kaybeder.
   - Eşzamanlı can bitişinde en çok toprağa sahip olan oyuncu (eşitlikte en çok doğru yanıtı olan) kazanır.

7. **Geri Kalana Destek (Catch-up Hint):**
   - 4. turdan sonra en az toprağa sahip oyunculara soru aşamasında 1 defaya mahsus 2 yanlış şıkkı eleyen 50/50 ipucu verilir.

8. **Web Audio API & Haptik:**
   - Harici ses dosyası indirilmez; tüm sesler (zafer, geri sayım, fethi tamamlama, alarm, buton klik) Web Audio API ile prosedürel olarak sentezlenir. Ağ gecikmesinden etkilenmez, 404 vermez.

---

## 🏗️ Proje Mimarisi

```
oyun22/
├── client/                     # React + Vite mobil istemci
│   ├── src/
│   │   ├── components/         # Modüler ekranlar ve bileşenler
│   │   │   ├── MapViewer.tsx   # Pinch-zoom & pan SVG harita motoru
│   │   │   ├── AudioEngine.ts  # Prosedürel Web Audio API synthesizer
│   │   │   ├── Haptics.ts      # Mobil titreşim motoru
│   │   │   ├── Icons.tsx       # Vektörel taç, kale, kalkan, semboller
│   │   │   └── ... (Tüm ekranlar)
│   │   ├── App.tsx             # Ana mobil UI konteyneri
│   │   └── main.tsx
│   ├── public/                 # PWA manifest ve vektörel ikonlar
│   └── vite.config.ts
├── server/                     # Node.js + Express + Socket.IO otoriter sunucu
│   ├── data/
│   │   └── questions.json      # 520 adet doğrulanmış, zamansız soru
│   ├── src/
│   │   ├── QuestionManager.ts  # Soru havuzu, gizleme & Madde 3-C sıralama
│   │   ├── MapEngine.ts        # Topoloji, komşuluk, kalkan, fetih & aktarım
│   │   ├── GameRoom.ts         # Sonlu Durum Makinesi (FSM) & Kıyamet
│   │   ├── RoomManager.ts      # 4 haneli oda yönetimi ve çöp toplayıcı
│   │   └── server.ts           # HTTP + WebSocket sunucusu
│   ├── tests/                  # Vitest entegrasyon testleri
│   └── scripts/                # Doğrulama ve headless bot simülasyonları
├── shared/                     # İstemci-sunucu ortak tipleri ve harita verisi
│   ├── types.ts                # TypeScript arayüzleri
│   ├── constants.ts            # Renkler, semboller, süreler, küfür filtresi
│   └── mapData.json            # 4 seviyeli optimize edilmiş Türkiye SVG haritası
├── render.yaml                 # Render.com otomatik dağıtım konfigürasyonu
└── package.json
```

---

## 🚀 Hızlı Kurulum ve Yerel Çalıştırma

### Gereksinimler
- Node.js (v18.0.0 veya üzeri)
- npm (v9.0.0 veya üzeri)

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Geliştirme Modunda Çalıştırın (HMR)
```bash
# Sunucu ve İstemciyi aynı anda ayağa kaldırır:
npm run dev
```
- İstemci: `http://localhost:5173` (veya yerel ağ IP'niz: örneğin `http://192.168.1.X:5173`)
- Sunucu: `http://localhost:3000`

### 3. Üretim (Production) Derlemesi ve Çalıştırma
```bash
# Hem istemciyi hem sunucuyu derler:
npm run build

# Üretim sunucusunu başlatır:
npm start
```
Tarayıcınızda veya telefonunuzda açın: `http://localhost:3000`

---

## 🧪 Test ve Doğrulama Komutları

Projede sıfır hata ve kusursuz oyun akışı için kapsamlı test araçları mevcuttur:

1. **Birim & Entegrasyon Testleri:**
   ```bash
   npm test
   ```
   *Madde 3-C sıralama mantığı, sayısal tahminler, harita komşulukları, kalkan koruması, başkent canı ve elenme toprak devirleri test edilir (10/10 test).*

2. **Harita ve Soru Doğrulama:**
   ```bash
   npm run verify
   ```
   *520 sorunun şık dengesi, benzersizliği, zamansızlığı ile 4 seviyeli haritanın tüm komşuluk ve simetri matrisleri doğrulanır.*

3. **Yapay Zeka / Bot Simülasyonu:**
   ```bash
   npm run sim
   ```
   *2, 3, 4, 5, 6, 8 ve 10 oyunculu maçları baştan sona kilitlenmesiz ve tam uyumla oynatan headless simülasyon.*

---

## ☁️ Render.com Üzerinde Canlı Yayına Alma

Proje, kök dizinde bulunan `render.yaml` sayesinde Render.com ile **%100 uyumlu ve tek tıkla canlıya alınabilir** durumdadır.

### Adım Adım Dağıtım:
1. Kodları kendi GitHub hesabınıza bir depoya (repository) gönderin:
   ```bash
   git init
   git add .
   git commit -m "feat: Fetih Turkiye v1.0 complete release"
   git branch -M main
   git remote add origin https://github.com/<KULLANICI_ADINIZ>/fetih-turkiye.git
   git push -u origin main
   ```
2. [Render.com](https://render.com) paneline giriş yapın.
3. **New +** butonuna basıp **Blueprint** seçeneğini seçin.
4. GitHub deponuzu bağlayın.
5. Render, projedeki `render.yaml` dosyasını otomatik olarak algılar:
   - **Environment:** `Node`
   - **Plan:** `Free`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
6. **Apply** butonuna tıklayın. 1-2 dakika içinde oyununuz `https://fetih-turkiye-xxxx.onrender.com` adresinde yayında olacaktır!

---

## 📜 Lisans & Atıf
- **Harita Verisi:** Projede kullanılan Türkiye il sınırları SVG geometrisi, [Doğukan Güven Nomak](https://github.com/dnomak/svg-turkiye-haritasi) tarafından hazırlanan ve MIT Lisansı ile sunulan açık kaynaklı çalışmadan derlenmiş ve oyun mekanikleri için 4 farklı kademeli bölge sistemine optimize edilmiştir.
- **Yazılım:** MIT Lisansı © 2026 Fetih Türkiye.
