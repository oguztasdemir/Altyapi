# Altyapı Manager Proje Özellikleri

Altyapı Manager, futbol akademileri ve genç takımların kadro planlaması, taktiksel analizleri, antrenman yönetimleri ve idari/finansal takipleri için geliştirilmiş premium özelliklere sahip akıllı bir yönetim ve simülasyon platformudur.

---

## 1. Dashboard (Genel Bakış)
* **Kadro & Oyuncu İstatistikleri**: Toplam kayıtlı takım/kadro sayısı ve faal lisanslı oyuncu adetleri.
* **Duyuru Panosu (Announcement Ticker)**: Kulüp yönetiminin yayımladığı önemli duyuruların ana sayfada kayan yazı olarak gösterimi.
* **Yaklaşan Faaliyetler**: Takımlara göre yaklaşan antrenman idmanları ve resmi maç fikstürleri.
* **Sakatlık Takibi**: Revirdeki sakat oyuncuların sayısı, durum raporları ve isim listesi.
* **Haftanın Formda Oyuncuları**: Maç puanlarına göre haftanın en formda 5 oyuncusunun listesi ve taktik saha üzerindeki dikey görsel gösterimleri.
* **Son Yapılan İşlemler (Sistem Günlüğü)**: Sistem genelindeki son eylemleri, veritabanı güncellemelerini ve antrenör hareketlerini dikey bir timeline zaman tüneliyle takip eden dashboard widget'ı.

## 2. Oyuncu Yönetimi & Performans Takibi
* **Detaylı Profil Kartları**: Yaş, boy, kilo, veli iletişim bilgileri, kan grubu ve aidat ödeme durumları.
* **Teknik Nitelik Analizleri**: 30'un üzerinde bireysel yetenek puanı (Bitiricilik, Pas, Markaj, Hız vb.) ve ortalama maç reyting grafikleri.
* **Gelişim Önerileri**: Oyuncunun zayıf kaldığı yetenek puanlarına ve mevki tipine göre otomatik gelişim tavsiyeleri üreten analiz motoru.

## 3. Taktik Yönetimi & 3 Panelli Simülasyon Arayüzü
* **📋 Taktik Tahtası (1. Panel)**:
  - Kadro dizilişlerini belirleme (4-3-3, 4-4-2, 3-5-2 vb.).
  - Oyuncuları sahaya sürükleyip bırakma, yedek kulübesi ve kadro havuzundan yerleştirme.
  - **Mevki Uyumluluk Kontrolü**: Oyuncunun kendi mevkisi dışına yerleştirilmesi durumunda forma çevresinde turuncu bir parlama (glow) efekti ve `⚠️` mevki uyarısı gösterimi.
  - Taktik tahtası üzerinde serbest çizim/not alma fırçası.
* **🏃‍♂️ Simülasyon (2. Panel)**:
  - Adım adım manuel taktik kurgulama aracı.
  - Top sahibi belirleme, paslaşma yolları, şut ve topsuz koşu yollarını çizgilerle çizme.
  - Adımları geri alma, silgi modu ve canlandırma (Play/Pause) özellikleri.
* **🤖 AI Taktik Üreteci (3. Panel)**:
  - Tamamen bağımsız kararlar alan 22 personanın (11v11) yer aldığı akıllı yapay zeka simülatörü.
  - **AI Oyun Tarzları**: Adım bazlı olarak seçilebilen *Tiki-Taka (Kısa Pas), Kanat Akını, Merkez Dripling, Uzun Top (Hedef Santrafor)* vb. hücum şablonları.
  - **Rakip AI Stratejileri**: Rakip takımın oyun tarzını belirleyen *Otobüsü Çek (Kompakt), Tam Saha Pres (Agresif), Hızlı Çıkış (Kontra)* ve *Dengeli* şablonları.
  - **Tüm Atağı Otomatik Simüle Et**: Tek tıkla, seçili stile uygun olarak şutla sonlanan 4-5 adımlık komple bir atağı AI yardımıyla otomatik oluşturma.
* **Adım Adım Sağ Panel Takibi**: Simülasyon ekranında kaçıncı adımda ne yapıldığını detaylarıyla (örn: *Pas: Arda ➡️ Semih*) gösteren ve tıklamayla o adıma gidilmesini sağlayan interaktif sağ panel.
* **Akıllı Ofsayt Engelleyici (Offside Avoidance)**: AI pas varyasyonlarını kurgularken alıcı oyuncuların ofsaytta kalmasını önlemek için oyuncu konumunu otomatik olarak defans çizgisinin arkasına çeken kural motoru.
* **Kavisli Top Hareketi**: Pas ve şutlarda topun havadan gidişini temsil etmek amacıyla topa uygulanan `Math.sin()` tabanlı dikey kavis (arc) ve büyüme/küçülme efekti.

## 4. Kulüp Takvim Planlayıcısı & Antrenman Paketleri
* **Etkinlik Oluşturucu**: Maç, antrenman ve toplantı takvimi.
* **Rutin Planlama**: Haftalık tekrarlanacak antrenman serilerini planlama.

## 5. Doğal Dil İşleme Tabanlı Akıllı Chatbot Asistanı
* **NLP Destekli Sohbet**: Doğal dilde yazılan soruları anlayarak finans, sakatlık, oyuncu bilgileri ve taktik kuralları hakkında bilgi verme.
* **Hızlı Aksiyon Onay Kutuları**: Arayüz üzerinden butonlarla onay verilebilen chatbot eylemleri.
* **Toplu Güncellemeler**: Chatbot üzerinden *"tüm forvetlerin bitiriciliğini 75 yap"* gibi toplu nitelik güncellemeleri yapabilme.
* **Haftalık Reçeteler**: *"Hücum antrenman paketi planla"* gibi komutlarla önümüzdeki haftanın günlerine özel antrenman programlarını tek seferde takvime işleyebilme.

## 6. Finans & KPI Analizi
* Gelir-gider tabloları, kasa bakiye durumu ve aidat ödeme oranlarını hesaplayan kulüp finans analiz kartları.
