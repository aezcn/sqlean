# Sqlean

**T-SQL sorgu biçimlendirici — tek dosya, kurulum yok, veri dışarı çıkmaz.**

Tek bir `index.html` dosyasından ibaret. Derleme adımı, bağımlılık, sunucu ve hesap
gerektirmez. Sorgularınız hiçbir zaman tarayıcınızdan çıkmaz — uygulama **sıfır ağ
isteği** yapar; DevTools → Network sekmesinden doğrulayabilirsiniz.

> **Canlı sürüm:** https://aezcn.github.io/sqlean/
> **Testler:** https://aezcn.github.io/sqlean/tests.html

---

## Nasıl kullanılır

**Yol 1 — tarayıcıdan (önerilen).** Yukarıdaki canlı bağlantıyı açın. Kurulum
gerekmez; kayıtlı sorgularınızı diskteki gerçek bir klasöre `.sql` dosyaları olarak
yazabilirsiniz.

**Yol 2 — çevrimdışı.** `index.html` dosyasını indirip çift tıklayın. Her şey çalışır;
yalnızca klasöre yazma özelliği devre dışı kalır (tarayıcılar bu API'yi `file://`
üzerinden engeller), kayıtlar tarayıcıda tutulur ve JSON ile taşınır.

Kurulum yetkisi olmayan iş bilgisayarları düşünülerek tasarlandı: indirilecek bir şey,
çalıştırılacak bir kurulum, açılacak bir hesap yok.

---

## Ne yapar

### Biçimlendirici

Tokenizer → çözümleyici → yazıcı olarak üç katman hâlinde sıfırdan yazıldı. Ağaç
önce tamamlandığı için ölçüm gerektiren işler (satır sarma, `AS` hizalama, doğru
girinti derinliği) mümkün.

- CTE zincirleri, iç içe alt sorgular, `CASE` blokları, pencere fonksiyonları
- `JOIN`/`ON`, `AND`/`OR` kırılımı, küme işlemleri (`UNION`, `EXCEPT`, `INTERSECT`)
- `INSERT`/`UPDATE`/`DELETE`/`MERGE`, `CREATE TABLE`, `BEGIN…END`, `IF`/`WHILE`,
  `TRY`/`CATCH`, `GO` ile ayrılmış batch'ler
- Anahtar kelime ve tanımlayıcı harf düzeni, girinti (2/4/8/tab), virgül konumu,
  satır genişliği, satır başına kolon sayısı, `AS` hizalama
- Tek satıra indirme, yorumları silme

Tanımadığı bir yapıyla karşılaşınca çuvallamaz: o parçayı olduğu gibi geçirir. En
kötü ihtimalle bir bölüm biçimlenmemiş kalır — sorgunuz asla bozulmaz.

### Analiz paneli

- **Ölçümler:** ifade, tablo, JOIN, CTE, alt sorgu derinliği, satır, karakter
- **Ana hat:** CTE ve alt sorgu ağacı — tıklayınca ilgili satıra atlar
- **Tablolar:** sorgunun dokunduğu tüm tablolar
- **Risk uyarıları**, her biri satır numarasıyla:
  - `WHERE` olmadan `UPDATE` / `DELETE`
  - `SELECT *`
  - `ON` koşulu olmayan `JOIN` (kartezyen çarpım)
  - `NOT IN` + alt sorgu (NULL tuzağı)
  - `WHERE` içinde kolonu saran fonksiyon (index kullanılamaz)
  - `LIKE '%…'` baştan joker
  - Dengesiz parantez, kapanmamış tırnak
  - `NOLOCK` bilgilendirmesi

### Araçlar

| Araç | Ne yapar |
|---|---|
| **Excel → IN** | Excel sütununu `IN (…)` listesine çevirir; tekilleştirir, tırnaklar, N'li gruplar |
| **IN → VALUES** | Değer listesinden `VALUES` tablosu, `#temp` tablo veya tablo değişkeni üretir |
| **Karşılaştır** | İki sorguyu aynı ayarlarla biçimlendirip satır satır karşılaştırır |
| **Kod stringi** | Sorguyu C#, Python, Java, JavaScript veya Go'ya gömülecek biçimde kaçırır |
| **Parametre** | Sabit değerleri `@p1`, `@p2` … hâline getirir, `DECLARE` bloğu üretir |
| **Yeniden adlandır** | Tablo/şema/takma adı token düzeyinde değiştirir — metin sabitlerine ve yorumlara dokunmaz |
| **Dışa aktar** | Markdown, renkli HTML (Word/e-posta için) veya düz metin |

### Kütüphane

Kayıtlı sorgular diskteki **gerçek bir klasöre** yazılır: her sorgu kendi `.sql`
dosyasıdır, SSMS'te doğrudan açılabilir. Üst veri (etiketler, sürüm geçmişi)
`_kutuphane.json` içinde tutulur.

Etiketler, içerikte arama, favoriler, `{{tablo}}` yer tutuculu şablonlar, son 5 sürümün
geçmişi, JSON dışa/içe aktarma.

### Editör

Sekmeler, canlı önizleme, söz dizimi renklendirme, satır numaraları, bul & değiştir
(regex destekli), sürükle-bırak dosya açma, otomatik taslak kaydı, açık/koyu tema,
komut paleti.

| Kısayol | |
|---|---|
| `Ctrl+↵` | Biçimlendir |
| `Ctrl+Shift+M` | Tek satıra indir |
| `Ctrl+S` | Kütüphaneye kaydet |
| `Ctrl+F` | Bul & değiştir |
| `Ctrl+K` | Komut paleti |
| `Ctrl+T` / `Ctrl+W` | Sekme aç / kapat |
| `Ctrl+B` | Analiz paneli |
| `Ctrl+/` | Kısayol listesi |

---

## Geliştirme

Derleme adımı yok. Depoyu klonlayın, `index.html` dosyasını düzenleyin, tarayıcıda açın.

```bash
git clone https://github.com/aezcn/sqlean.git
cd sqlean
python3 -m http.server 8000
```

Ardından `http://localhost:8000/index.html` (uygulama) ve
`http://localhost:8000/tests.html` (testler).

> Klasöre yazma ve kalıcı izinler güvenli bağlam ister; bu yüzden geliştirirken
> `file://` yerine `localhost` üzerinden açın.

### Testler

`tests.html`, `index.html` dosyasını gizli bir iframe içinde yükleyip motoru
`iframe.contentWindow.SQL` üzerinden çağırır — kod kopyalanmaz, `eval` kullanılmaz.

Her fixture üç ayrı kontrolden geçer:

1. **Beklenen çıktı** — bilinen girdi/çıktı çiftleri
2. **Değişmezlik** — `format(format(x)) === format(x)`, biçimlendirme kararlı olmalı
3. **Bozulmama** — `minify(format(x)) === minify(x)`, token dizisi korunmalı;
   biçimlendirme sorgunun anlamını değiştiremez

Ayrıca her fixture 16 farklı seçenek kombinasyonunda hata atmadan ve kararlı biçimde
çalışmak zorunda. Yeni bir vaka eklemek için `tests/cases.js` dosyasına bir nesne ekleyin.

### Dosya yapısı

```
index.html      Uygulamanın tamamı — çalışması için gereken tek dosya
tests.html      Tarayıcıda çalışan test koşucusu
tests/cases.js  Test fixture'ları
examples/       Örnek sorgular
```

`index.html` içi bannerlı bölümlere ayrılmıştır: `SQL.Lex` (tokenizer),
`SQL.Parse` (düğüm ağacı), `SQL.Print` (yazıcı), `SQL.Analyze` (analiz),
`SQL.Paint` (renklendirme), `App.Store`, `App.Shell`, `App.Library`, `App.Tools`.

---

## Bilinen sınırlar

- **Yalnızca T-SQL.** PostgreSQL, MySQL ve Oracle'a özgü sözdizimi çözümlenmez;
  tanınmayan kısımlar olduğu gibi geçirilir.
- **Çözümleyici gevşektir.** Tam bir T-SQL grameri değildir; egzotik sorgularda bazı
  bölümler biçimlenmemiş kalabilir. Bu, çökmeye tercih edilen bilinçli bir karardır.
- **`file://` kipinde kütüphane sınırlıdır.** Klasöre yazma yalnızca Pages veya
  localhost üzerinden çalışır.

---

## English

**T-SQL query formatter — single file, no install, nothing leaves your browser.**

The whole application is one `index.html`. No build step, no dependencies, no server,
no account. It makes **zero network requests** — verify it in DevTools → Network.

Built for locked-down work machines where you cannot install anything: open the
[live version](https://aezcn.github.io/sqlean/), or download the file and
double-click it.

**Features.** A from-scratch tokenizer → parser → printer engine (CTEs, subqueries,
`CASE`, window functions, `MERGE`, control flow, `GO` batches) with configurable
keyword case, indentation, comma position, line width and `AS` alignment. An analysis
panel reporting query metrics, an outline, referenced tables and risk warnings
(`UPDATE`/`DELETE` without `WHERE`, `SELECT *`, cartesian joins, `NOT IN` NULL traps,
non-sargable predicates, leading wildcards). Tools for Excel→`IN` lists, `VALUES`/temp
tables, query diffing, code-string escaping, parameterization, token-safe renaming and
export. A library that writes saved queries as real `.sql` files to a folder on disk.

**Development.** No build. Clone, edit `index.html`, run `python3 -m http.server 8000`
and open `localhost:8000`. Tests live in `tests.html`; every fixture is checked for
expected output, idempotence (`format∘format = format`) and non-destruction
(`minify∘format = minify`) across 16 option combinations.

**Limits.** T-SQL only. The parser is deliberately loose — unrecognized constructs pass
through untouched rather than crashing. Writing to a disk folder requires a secure
context, so it is unavailable when opened via `file://`.

---

MIT lisanslı. Katkılara açıktır.
