# Altyapı Manager - Football Manager (FM) Esintili Altyapı Yönetim Sistemi

Altyapı Manager, futbol altyapı takımlarının oyuncu gelişimlerini, performans verilerini, sağlık durumlarını, yoklama/katılım oranlarını, veli iletişim detaylarını ve görsel arşivlerini Football Manager (FM) ve EA FC oyun arayüzlerinden esinlenerek modern, premium bir tasarım ile yönetebilmenizi sağlayan web tabanlı bir uygulamadır.

---

## 🚀 Eklenen ve Sunulan Özellikler

### 1. Panel Boyutlandırıcı Sürükle-Bırak Bölücüler (Splitters) & Kalıcılık
*   **Kolon Bazlı Genişlik Kontrolü**: `Sidebar`, `Takımlar`, `Futbolcular` ve `Detay Paneli` arasındaki dikey sınırlar üzerinden mouse ile sürükleyerek genişliklerini dilediğiniz gibi ayarlayabilirsiniz.
*   **Tarayıcı Hafızası (localStorage) Entegrasyonu**: Ayarladığınız özel panel genişlikleri tarayıcınıza kaydedilir; sayfayı yenilediğinizde veya kapatıp açtığınızda kaldığı yerden devam eder.
*   **Dinamik Gizlenme**: Herhangi bir menü geçişinde yan paneller gizlendiğinde bölücüler de otomatik olarak gizlenir.

### 2. Etkileşimli İlk 11 / Taktik Saha Mevki Seçici (Direct Pitch Position Editor)
*   **Saha Üzerinden Mevki Yönetimi**: Oyuncu profili detaylarında sağ üstte bulunan Taktik Saha Önizlemesine tıkladığınızda "Düzenleme Modu" aktif hale gelir ve diziliş seçeneği belirir.
*   **Döngüsel Tıklama Sistemi**:
    *   **1 Tıklama (Yeşil)**: Mevkiyi oyuncunun **Ana Mevkisi (Primary Position)** yapar. Diğer yeşil mevkiler otomatik sıfırlanır.
    *   **2 Tıklama (Sarı)**: Mevkiyi oyuncunun **Yan Mevkisi (Secondary Positions)** listesine ekler.
    *   **3 Tıklama (Gri)**: Mevkiyi pasif hale getirir ve oyuncunun mevkilerinden siler.
*   **Otomatik Kayıt**: Saha üzerinde yaptığınız her tıklama anında veritabanına kaydedilir ve arayüz dinamik olarak güncellenir.
*   **Esnek Diziliş Desteği**: `4-3-3`, `4-4-2` ve `3-5-2` dizilişleri arasında geçiş yaparak mevkilerin saha üzerindeki konumlarını değiştirebilirsiniz.

### 3. Taktik Saha Çizim Aracı (Tactical Drawing Canvas)
*   **Serbest Çizim Desteği**: Taktik saha üzerinde antrenörlerin taktik anlatımlarını kolaylaştırmak amacıyla şeffaf bir `<canvas>` çizim katmanı yerleştirilmiştir.
*   **Gelişmiş Kontroller**: Çizim yaparken kullanabileceğiniz 4 farklı renk seçeneği (Kırmızı, Sarı, Mavi, Beyaz) ve tek tıkla tüm çizimi temizlemeyi sağlayan "Sil" butonu eklenmiştir.
*   **Mobil / Dokunmatik Desteği**: Hem masaüstünde fare hem de mobilde parmak hareketleri ile taktik sahasına serbestçe çizim yapılabilmektedir.

### 4. Gelişmiş Medya & Arşiv Yönetimi (Çoklu Fotoğraf / Video)
*   **Çoklu Oyuncu Görselleri**: Her futbolcu için tek bir profil fotoğrafı yerine, birden fazla maç/antrenman görseli yüklenebilen bir görsel galerisi oluşturulmuştur.
*   **Futbolcu Medya Arşivi**: Oyuncunun bireysel antrenman videoları, scout raporları, pdf dosyaları ve belgelerini barındıran gelişmiş arşiv yönetim sistemi entegre edilmiştir.
*   **Takım Medya Arşivi**: Tüm takıma yönelik maç videoları, kutlama fotoğrafları ve antrenman notları gibi paylaşımların yapılabileceği takım bazlı arşiv alanı eklenmiştir.

### 5. Veli Bilgilendirme Jeneratörü (WhatsApp Entegrasyonlu)
*   **Hazır Şablon Yönetimi**: Veli İletişim sekmesine entegre edilen "Aidat Hatırlatması", "Devamsızlık Uyarısı", "Antrenman Değişikliği" ve "Performans Değerlendirmesi" hazır şablonları eklenmiştir.
*   **Dinamik Değişken Eşleme**: Seçilen şablonun içeriği veli adı, oyuncu adı ve borç tutarı gibi güncel verilerle otomatik olarak doldurulur.
*   **Tek Tıkla WhatsApp**: Hazırlanan veya el ile düzenlenen mesaj tek tıkla `https://wa.me/` API'si üzerinden velinin numarasına WhatsApp aracılığıyla yönlendirilir.

### 6. Detaylı Oyuncu Profili & Attributes Grid (EA FC & FM Tarzı)
*   **Yetenek Yıldızları**: Oyuncuların mevcut ve potansiyel yetenekleri FM tarzı yıldız derecelendirmesiyle gösterilir.
*   **Fiziksel Veriler**: Boy (cm), Kilo (kg), Tercih Ayak, Yaş, Uyruk ve Sözleşme Süreleri detaylı kartta yer alır.
*   **Kategorize Edilmiş Özellikler**: Oyuncu yetenekleri zihinsel, teknik ve fiziksel olarak ayrılmıştır. Fareyle üzerine gelindiğinde Türkçe açıklamaları ve EA FC tarzında özellikleri gösteren detay kartı açılır.
*   **Renkli İlerleme Çubukları**: Yetenek derecesine göre HSL tabanlı yeşil (mükemmel), sarı (iyi), turuncu (ortalama) ve kırmızı (zayıf) renk geçişleri tasarlanmıştır.

### 7. Performans Analizleri & Son 5 Maç İki Eksenli Grafik
*   **Reyting Gelişim Grafiği**: Oyuncunun zaman içindeki ortalama reyting gelişimini çizgi grafiği yardımıyla takip edebilirsiniz.
*   **Son 5 Maç Performans Grafiği**: HTML5 Canvas tabanlı yeni iki eksenli grafikte; oyuncunun son 5 maçtaki golleri (yeşil bar), asistleri (mavi bar) ve maç reytingleri (sarı çizgi) bir arada gösterilir.

### 8. Sporcu Karnesi PDF/Yazıcı Çıktısı (A4 Scout Raporu)
*   **A4 Rapor Çıktı Şablonu**: Profil panelinde yer alan "Rapor Yazdır" butonu, oyuncunun güncel profil fotoğrafını, fiziksel ölçümlerini, mevki bilgilerini, detay yetenek puanlarını, sezon istatistiklerini, sakatlık geçmişini ve antrenör değerlendirme notlarını A4 kağıdı formatında profesyonel bir karne olarak düzenleyerek tarayıcı yazdırma (`window.print()`) arayüzünü tetikler.

### 10. Premium Akademi Yönetim Özellikleri (Yeni)
*   **Yoklama ve Gelişim Korelasyonu**: Oyuncuların antrenman katılım oranları dinamik olarak hesaplanarak gelişim ve performans verileriyle ilişkilendirilir.
*   **Haftanın En Formda 5 Futbolcusu & Otomatik Rozetler**: Son maç reytinglerine göre otomatik olarak belirlenen en formda 5 oyuncu anasayfada taktik saha görünümüyle listelenir. Ayrıca oyunculara kazandıkları başarılara göre otomatik rozetler ve başarı kartları (Achievements) atanır.
*   **Etkileşimli Sakatlık Rehabilitasyon Takibi**: Sakat oyuncular için interaktif aşama seçimi (Dinlenme ➡️ Fizik Tedavi ➡️ Bireysel Koşu ➡️ Takımla İdman) ve `%0-%100` ilerleme çubuğu (slider) ile iyileşme süreci anlık olarak takip edilir.
*   **Finansal Trend ve Nakit Akış Grafiği (Gelir/Gider)**: Finans sekmesinde son 6 aya ait aidat gelirleri ve kulüp giderleri, canvas tabanlı özel etkileşimli bir sütun grafiği ile görselleştirilerek net bakiye analiz edilir.

---

## 🛠️ Teknolojiler
*   **Backend**: Python HTTPServer (Multithreaded API & Static Files Router)
*   **Database**: SQLite (`database.db`)
*   **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Grid / HSL Glows), Vanilla ES6 Modules Javascript
*   **Charts**: Custom HTML5 Canvas charts & SVG dynamic geometry
