# MESA Şantiye Elektrik Testi Ön Şart Takip Sistemi

Şantiyede elektrik testine girebilmek için gereken ön şartların (Mekanik işleri, Klima/VRF işleri, MESA Teslim & Kabul Onayı) adım adım takip edildiği ve raporlandığı web tabanlı yönetim sistemi.

## 📌 Proje Kapsamı ve Yapı
- **10 Blok**: Blok 1'den Blok 10'a kadar tüm binalar.
- **Her Blokta 8 Kat**: 
  - Çatı Katı
  - 4. Kat
  - 3. Kat
  - 2. Kat
  - 1. Kat
  - Zemin Kat
  - B1 (Bodrum 1)
  - B2 (Bodrum 2)
- **Toplam 80 Bağımsız Birim / Kat**

---

## ⚡ Elektrik Testi Kabul Zinciri ve İş Kuralları

Sistem, şantiye kalite ve güvenlik protokollerine göre sıralı şart zincirini otomatik olarak denetler:

1. **1. Aşama: Mekanik İmalatı**
   - Sıhhi tesisat, yangın, kazan ve mekanik montajların bitirilmesi gerekir.
2. **2. Aşama: Klima (VRF) / Havalandırma İmalatı**
   - VRF iç/dış üniteler, menfezler, bakır borulama ve drenaj testlerinin bitirilmesi gerekir.
3. **3. Aşama: MESA Teslim & Kabul Onayı**
   - ⚠️ **Kural:** Mekanik VE Klima işlerinin her ikisi de *"Tamamlandı"* olmadan MESA firması teslim alamaz ve sisteme onay girilemez.
   - İki ön şart tamamlanınca kat *"MESA Onayı Bekliyor"* durumuna geçer. MESA kontrol mühendisi inceleyip onaylayınca veya revizyon isteyince sisteme işlenir.
4. **4. Aşama: Elektrik Testi**
   - 🔒 **Kural:** MESA firması onay vermeden kat *"Kilitli"* durumdadır ve elektrik testine başlanamaz.
   - MESA onay verdiği anda kat otomatik olarak **⚡ "TESTE HAZIR"** rozetine kavuşur.
   - Test ekibi sahada testleri (izolasyon, meger, gerilim, fonksiyon) yapar ve sonucu *"Test Başarılı / Tamamlandı"* veya *"Uygunsuzluk Var"* olarak kaydeder.

---

## 👥 Kullanıcı Rolleri & Güvenlik
- **👁️ İzleyici Modu (Sadece Görüntüleme):**
  - Sahadaki taşeronlar, mühendisler ve ekip üyeleri linke tıkladığında tüm katların anlık durumunu, ısı haritasını, MESA onaylarını ve test sonuçlarını görebilir.
  - Değişiklik yapamazlar, durum butonları kilitlidir.
- **🛡️ Yönetici (Admin) Modu:**
  - Sağ üstteki **"Yönetici Girişi"** butonundan şifre ile giriş yapılır.
  - **Varsayılan Şifre:** `admin123` *(Yönetici panelinden istenildiği zaman değiştirilebilir)*.
  - Admin; katların mekanik/klima/MESA/test durumlarını güncelleyebilir, teslim tutanağı ve test raporu numarası girebilir, blok bazında toplu işlem yapabilir.

---

## 🚀 Çalıştırma ve Şantiyede Kullanım

### 1. Bu Bilgisayardan Açma
Sunucu şu anda arka planda aktiftir. Tarayıcınızda (Chrome, Safari vs.) açın:
👉 **http://localhost:8088**

*(İsterseniz doğrudan `index.html` dosyasını çift tıklayarak da açabilirsiniz; sistem yerel depolama ve çevrimdışı mod desteğine sahiptir).*

### 2. Şantiyede Cep Telefonu veya Tabletten Bağlanma
Bilgisayarınız şantiyedeki Wi-Fi ağına veya telefonunuzun kişisel erişim noktasına (Hotspot) bağlıyken, aynı ağdaki diğer cihazların tarayıcısına:
👉 **`http://<BILGISAYAR_IP_ADRESI>:8088`** yazmanız yeterlidir.

### 3. Sunucuyu Manuel Başlatmak İsterseniz
Terminalden:
```bash
cd /Users/mozkan/.gemini/antigravity/scratch/santiye-elektrik-test-takip
./start.sh
```

---

## 📊 Öne Çıkan Özellikler
- **🗺️ Şantiye Isı Haritası (10 Blok × 8 Kat):** 80 katın tamamını tek ekranda renk kodlarıyla gösterir.
- **🏢 Blok Kesiti & Kat Kartları:** Çatıdan B2'ye bina dikey kesitinde 4 aşamalı ilerleme kutuları.
- **📋 Detaylı Filtreli Tablo:** "Sadece Teste Hazır Olanlar", "MESA Bekleyenler", "Eksik Olanlar" şeklinde anında filtreleme ve arama.
- **⚡ Toplu İşlem:** Örneğin "Blok 1'deki tüm katların mekaniğini tamamlandı yap" şeklinde tek tıkla toplu güncelleme.
- **📥 Excel / CSV İndir:** Türkçe karakter uyumlu (UTF-8 BOM) tek tıkla Excel durum raporu indirme.
- **🖨️ Yazdırılabilir Şantiye Raporu:** MESA şantiye şefine veya hakedişe sunmak üzere A4 formatında temiz çıktı.
- **📜 İşlem & Onay Günlüğü (Audit Trail):** Kim ne zaman hangi katı onayladı, MESA yetkilisi kimdi gibi kayıtları geriye dönük saklar.
