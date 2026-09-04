# AK Parti Kişiselleştirilebilir Aday Tanıtım Platformu

Bu proje, AK Parti adaylarının kod yazmadan kendi kişiselleştirilebilir tanıtım sitelerini oluşturabilmelerini, içeriklerini (öz geçmiş, vaatler, projeler, haberler, galeri, sosyal medya, iletişim) kolayca yönetebilmelerini ve Süper Admin tarafından hesapların denetlenmesini sağlayan tam kapsamlı bir web uygulamasıdır.

Öğrenci seviyesinde anlaşılır, sade, modüler ve temiz bir mimari ile Node.js, Express.js, SQLite ve EJS kullanılarak geliştirilmiştir.

---

## 📘 KULLANIM VE KURULUM REHBERİ (Öğrenciler İçin)

### 1. Gerekli Programlar Nasıl Kurulur?

Projeyi bilgisayarınızda çalıştırabilmek için aşağıdaki programların kurulu olması gerekir:

1. **Node.js ve NPM**:
   - [Node.js Resmi Web Sitesi](https://nodejs.org/)'ne gidin.
   - **LTS (Uzun Süreli Destek)** sürümünü indirip kurun.
   - Kurulum tamamlandıktan sonra komut satırını (Terminal / PowerShell) açıp şu komutlarla kontrol edin:
     ```bash
     node -v
     npm -v
     ```
2. **Kod Editörü (VS Code)**:
   - Kodları incelemek için [Visual Studio Code](https://code.visualstudio.com/) kurmanız tavsiye edilir.

---

### 2. `npm install` Nasıl Çalıştırılır?

Proje klasörünü terminalde veya komut satırında açın ve bağımlılıkları yüklemek için şu komutu çalıştırın:

```bash
npm install
```

Bu komut `package.json` dosyasında tanımlı olan şu kütüphaneleri otomatik olarak indirir:
- `express`: Web sunucusu ve rota yönetimi.
- `sqlite3`: SQLite veritabanı sürücüsü.
- `ejs`: HTML şablon motoru.
- `bcrypt`: Şifreleri veritabanına güvenli şifrelenmiş (hash) olarak kaydetmek için.
- `express-session`: Kullanıcı oturumlarını saklamak için.
- `multer`: Resim (profil, kapak, galeri) yüklemelerini yönetmek için.
- `dotenv`: `.env` dosyasındaki gizli değişkenleri okumak için.

---


### 4. SQLite Veritabanı Nasıl Oluşur?

Veritabanı için **manuel hiçbir işlem yapmanıza gerek yoktur!**

Sunucuyu ilk kez başlattığınızda `veritabani.js` dosyası otomatik olarak çalışır ve projenin ana dizininde `veritabani.sqlite` dosyasını oluşturur. İçerisindeki 11 tablo (`kullanicilar`, `aday_profilleri`, `ozgecmis`, `vaatler`, `projeler`, `haberler`, `galeri`, `sosyal_medya`, `iletisim_bilgileri`, `site_ayarlari`, `ziyaretler`) `CREATE TABLE IF NOT EXISTS` komutları ile otomatik kurulur.

---

### 5. Sunucu Nasıl Başlatılır?

Terminalde projenin bulunduğu klasördeyken şu komutlardan birini çalıştırın:

```bash
npm start
```

Veya otomatik yeniden başlatma desteği ile çalıştırmak için:
```bash
npm run dev
```

Sunucu başladığında konsolda şu bağlantı adresleri görünecektir:
- **Ana Sayfa / Aday Tanıtım**: `http://localhost:3000`
- **Aday Giriş / Kayıt**: `http://localhost:3000/giris` veya `http://localhost:3000/kayit`
- **Aday Yönetim Paneli**: `http://localhost:3000/panel`
- **Süper Admin Paneli**: `http://localhost:3000/yonetim`

---

### 6. Aday Hesabı Nasıl Açılır?

1. `http://localhost:3000/kayit` adresine gidin.
2. Ad, Soyad, E-posta, Telefon, İl, İlçe ve Şifre bilgilerinizi doldurup **Kayıt Ol** butonuna basın.
3. Hesabınız ilk oluşturulduğunda durumu `onay_bekliyor` olacaktır.
4. Giriş yapabilmek için **Süper Admin** panelinden hesabınızın onaylanması gerekmektedir.

---

### 7. Süper Admin Nasıl Oluşturulur?

1. İlk Süper Admin hesabı `.env` dosyasındaki `SUPER_ADMIN_EPOSTA` ve `SUPER_ADMIN_SIFRE` bilgileri ile sunucu ilk başladığında **otomatik veritabanına eklenir**.
2. Süper Admin paneline erişmek için `http://localhost:3000/yonetim/giris` adresine gidin.
3. `.env` dosyasında belirlediğiniz e-posta (`admin@akparti.org.tr`) ve şifre (`Admin123!`) ile giriş yapın.
4. Giriş yaptıktan sonra onay bekleyen tüm adayları görebilir, tek tıkla onaylayabilir, dilediğiniz adayı aktif/pasif yapabilir veya silebilirsiniz.

---

### 8. Domainler Gerçek Sunucuda Nasıl Ayrılır?

Gerçek bir sunucuya (Nginx veya Apache reverse proxy ile) canlıya alındığında:

1. DNS ayarlarından domainler yönlendirilir:
   - Tanıtım siteleri: `www.siteadi.com`
   - Aday paneli: `panel.siteadi.com`
   - Süper admin paneli: `yonetim.siteadi.com`
2. `.env` dosyasındaki `GELISTIRME_MODU` değeri `false` yapılır:
   ```env
   GELISTIRME_MODU=false
   DOMAIN_TANITIM=www.siteadi.com
   DOMAIN_PANEL=panel.siteadi.com
   DOMAIN_YONETIM=yonetim.siteadi.com
   ```
3. Nginx konfigürasyonunda gelen isteklerin HTTP `Host` başlığı Express sunucusuna iletilir. `middleware/domainKontrol.js` dosyası gelen isteğin domainine göre erişimi otomatik ayrıştırır.

> **Önemli**: Süper Admin adresine tanıtım sitelerinde, menülerde veya footer bölümünde hiçbir bağlantı verilmez. Giriş adresi yalnızca yöneticiler tarafından doğrudan yazılarak erişilebilir.

---

### 9. Proje Klasör ve Dosya Yapısı Açıklamaları

```text
aday/
├── server.js                  # Express uygulaması, middleware bağlama ve port dinleme.
├── veritabani.js              # SQLite veritabanı bağlantısı, 11 tablonun oluşturulması ve ilk admin seeding.
├── .env                       # Gizli şifreler, port ve domain çevre değişkenleri.
├── package.json               # Npm paketleri ve proje ayarları.
├── README.md                  # Proje dokümantasyonu ve öğrenci kullanım rehberi.
│
├── middleware/
│   ├── domainKontrol.js       # Domain ve subdomain yönlendirme kontrolü.
│   ├── oturumKontrol.js       # Aday ve Süper Admin oturum & yetki kontrolleri.
│   └── dosyaYukle.js          # Multer resim yükleme ve JPG/PNG/WEBP güvenlik filtreleri.
│
├── routes/
│   ├── genelRoutes.js         # Kayıt, giriş, çıkış ve public /aday/:slug tanıtım rotaları.
│   ├── panelRoutes.js         # Adayın kendi içeriklerini yönettiği CRUD rotaları (/panel).
│   └── superAdminRoutes.js    # Süper Admin denetim ve yönetim rotaları (/yonetim).
│
├── views/
│   ├── ana_sayfa.ejs          # Aktif adayların listelendiği ana karşılama sayfası.
│   ├── kayit.ejs              # Aday başvuru & kayıt formu.
│   ├── giris.ejs              # Aday giriş ekranı.
│   ├── hata.ejs               # Özel hata ve 404 ekranı.
│   │
│   ├── aday/
│   │   └── tanitim.ejs        # Adayın 12 bölümden oluşan kamuya açık tanıtım web sitesi.
│   │
│   ├── panel/                 # Aday Yönetim Paneli Sayfaları
│   │   ├── layout_ust.ejs     # Panel sol menü ve üst bar başlığı.
│   │   ├── layout_alt.ejs     # Panel alt kapanış ve JS bağlama.
│   │   ├── geneller.ejs       # İstatistik kartları ve hızlı işlemler.
│   │   ├── kisisel.ejs        # Profil/Kapak fotosu, ad, soyad ve unvan formu.
│   │   ├── ozgecmis.ejs       # Biyografi, eğitim ve kariyer geçmişi.
│   │   ├── vaatler.ejs        # Adaylık vaatleri ekleme ve silme.
│   │   ├── projeler.ejs       # Proje görselleri ve detayları yönetimi.
│   │   ├── haberler.ejs       # Haber ve duyurular ekleme/silme.
│   │   ├── galeri.ejs         # Saha çalışması fotoğrafları galerisi.
│   │   ├── sosyal.ejs         # Facebook, Instagram, Twitter, YouTube linkleri.
│   │   ├── iletisim.ejs       # Telefon, e-posta, adres ve Google Harita yerleştirme.
│   │   └── ayarlar.ejs        # Siteyi yayına alma/gizleme, logo yükleme ve renk ayarı.
│   │
│   └── super-admin/           # Süper Admin Paneli Sayfaları
│       ├── giris.ejs          # Özel gizli Süper Admin giriş ekranı.
│       ├── panel.ejs          # Toplam istatistikler ve son başvurular.
│       ├── adaylar.ejs        # Tüm adayları listeleme, onaylama, silme ve ekleme.
│       └── aday_duzenle.ejs   # Aday bilgilerini admin tarafından güncelleme.
│
└── public/
    ├── css/
    │   └── style.css          # AK Parti kurumsal renkleri, Light/Dark mod stilleri ve responsive düzen.
    ├── js/
    │   └── ana.js             # Aydınlık/Karanlık mod, Türkçe/İngilizce dil seçimi ve mobil menü JS.
    └── uploads/               # Yüklenen profil, kapak, galeri ve proje görsellerinin kaydedildiği klasör.
```

---

## 🎨 Tasarım ve Tema Özellikleri

- **AK Parti Kurumsal Renk Paleti**: Kırmızı (`#E30613`), Beyaz ve Altın Sarı (`#FFC600`) tonları kullanılmıştır.
- **Aydınlık / Karanlık Mod (Light & Dark Theme)**: Seçilen tema istemci tarafında `localStorage` ile saklanır ve sayfa yenilense dahi korunur.
- **Çoklu Dil Desteği (Türkçe & İngilizce)**: Sistem Türkçe varsayılan olarak açılır, dil seçimi `localStorage` ile saklanır. Adaylar isterlerse İngilizce içeriklerini ayrı olarak girebilirler. İngilizce girilmeyen alanlarda otomatik olarak Türkçe metin gösterilir.
