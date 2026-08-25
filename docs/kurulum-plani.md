# Sqlean — Sıfırdan Kurulum Planı

Bu belge, Sqlean'i **sıfırdan yeniden inşa etmek** için yazılmış bir şartnamedir.
Hedef okuyucu, projeyi hiç görmemiş bir yapay zeka ya da geliştiricidir.

Belgenin asıl değeri **§4 Tuzaklar** bölümündedir. Oradaki maddelerin her biri,
inşa sırasında gerçekten yapılmış ve testlerle yakalanmış bir hatadır. Onları
okumadan başlanırsa aynı hatalar tekrar yapılır.

---

## 1. Ürün ve kısıtlar

**Sqlean**, T-SQL sorgularını biçimlendiren, çözümleyen ve görselleştiren bir web
uygulamasıdır. Tamamen tarayıcıda çalışır.

### Değiştirilemez kısıtlar

| Kısıt | Gerekçe |
|---|---|
| **Tek `index.html`** — derleme adımı yok | Hedef kullanıcı, iş bilgisayarına hiçbir şey kuramıyor |
| **Sıfır bağımlılık, sıfır ağ isteği** | Sorgular kurumsal veri; tarayıcıdan çıkmamalı ve bu doğrulanabilir olmalı |
| **Yalnızca T-SQL** | Tek lehçe, tek anahtar kelime seti |
| **Arayüz Türkçe** | README çift dilli |
| **ES5 uyumlu yazım** (`var`, `function`) | Derleme olmadığı için transpile yok; eski tarayıcı riski alınmıyor |

### Ölçek

Bitmiş hâli yaklaşık: `index.html` **6600 satır**, `tests.html` **260 satır**,
`tests/cases.js` **650 satır**, toplam **85 test vakası**.

---

## 2. Mimari

Motor üç katmandır ve bu ayrım pazarlık konusu değildir:

```
tokenizer  →  çözümleyici  →  yazıcı
SQL.Lex       SQL.Parse        SQL.Print
```

**Neden tek geçişli bir biçimlendirici yazılmamalı:** Token'ları okurken doğrudan
metin üreten bir tasarımda, satır yazılırken bloğun nerede biteceği bilinmez. Bu
yüzden CTE zincirleri, iç içe alt sorgular ve `CASE` blokları doğru girintilenemez;
satır genişliğine göre sarma ve `AS` hizalama ise tamamen imkânsızdır — ikisi de
yazmadan önce ölçüm gerektirir. Ağaç önce tamamlanmalıdır.

### Dosya içi bölümler

`index.html` içinde, bannerlı yorumlarla ayrılmış, her biri kendi IIFE'si olan
bölümler:

| Bölüm | Sorumluluk | Yaklaşık boy |
|---|---|---|
| `<style>` | Tasarım tokenları, düzen, tema | 870 satır |
| `SQL.Lex` | Tokenizer | 260 satır |
| `SQL.Parse` | Düğüm ağacı | 750 satır |
| `SQL.Print` | Yazıcı | 800 satır |
| `SQL.Analyze` | Ölçüm, ana hat, risk uyarıları | 360 satır |
| `SQL.Graph` | Tablo/join ilişki çıkarımı | 440 satır |
| `SQL.Paint` | Söz dizimi renklendirme | 70 satır |
| `App.Store` | IndexedDB + localStorage | 100 satır |
| `App.Shell` | Editör kabuğu | 950 satır |
| `App.Library` | Kayıtlı sorgular | 580 satır |
| `App.Tools` | Yedi yardımcı araç | 670 satır |
| `App.Viz` | Etkileşimli SVG şema | 720 satır |

Bağımlılık yönü tek yönlüdür: `App.*` → `SQL.*`. `SQL.*` katmanları DOM'a
dokunmaz (`SQL.Paint` yalnızca HTML metni üretir), bu yüzden iframe içinden
test edilebilirler.

---

## 3. Katman şartnameleri

### 3.1 SQL.Lex — tokenizer

Sticky (`/y`) regex'lerle tek geçiş. Çıktı:

```js
{ tokens: [...], lines: <sayı>, issues: [...] }
```

Token alanları: `type`, `value`, `up` (büyük harfli, yalnızca `word`/`var`),
`start`, `end`, `line`, `nl` (öncesindeki satır sonu sayısı), `spaced`
(öncesinde boşluk var mı), ayrıca `func`, `block`, `own`, `unterminated`,
`quoted`.

Token türleri: `comment`, `string`, `ident` (tırnaklı), `number`, `var`
(`@x`, `@@x`, `#t`, `##t`), `word`, `op`, `punc`, `other`.

Dışa açılanlar: `tokenize`, `matchKeyword`, `nextReal`, `KEYWORDS`, `PHRASES`,
`NON_FUNC`, `FUNCTIONS`.

**Zorunlu davranışlar**
- Kapanmamış metin sabiti / blok yorum / köşeli parantez için ayrı geri düşüş
  dalı; token yine üretilir, `unterminated: true` işaretlenir ve `issues`'a
  uyarı yazılır. Asla hata atılmaz.
- `nl` ve `spaced` bilgileri **çözümleyici için hayatidir** (§4.2, §4.3).
- Çok kelimeli kalıplar (`GROUP BY`, `LEFT OUTER JOIN`) `PHRASES` kümesinden
  en uzundan kısaya denenir.

### 3.2 SQL.Parse — düğüm ağacı

Tam T-SQL grameri **değildir**. Yalnızca biçimlendirme için gereken blok
yapısını çıkarır.

**Düğüm türleri**

| Düğüm | İçerik |
|---|---|
| `Batch` | `GO` ile ayrılmış grup |
| `Stmt` | Tek ifade; gövdesi yan tümce listesi |
| `Cte` | `WITH ad AS ( … )` zinciri + `main` |
| `Clause` | `SELECT`/`FROM`/`WHERE`/… + gövde + `raw` |
| `Join` | Tür + `source` + `on` + `raw` |
| `SetOp` | `UNION`/`EXCEPT`/`INTERSECT` |
| `Block` | `BEGIN…END`, `BEGIN TRY…END TRY`, `BEGIN CATCH…END CATCH` |
| `If` | `IF`/`WHILE`/`ELSE IF` + `cond` + `then` + `els` |
| `Paren` | `kind`: `sub` \| `func` \| `over` \| `group` |
| `Case` | `operand` + `whens[]` + `els` + `closed` |
| `Kw`, `Tok`, `Comment` | İfade düzeyi yapraklar |
| `Raw` | **Çözümlenemeyen token dizisi** |

`Raw` tasarımın en önemli parçasıdır: tanınmayan bir yapıyla karşılaşınca
çözümleyici pes etmez, o diziyi olduğu gibi geçirir. En kötü ihtimalle bir
bölüm biçimlenmeden kalır; sorgu asla bozulmaz.

Dışa açılanlar: `parse`, `splitList`, `splitCond`, `CLAUSE`, `JOIN`, `SETOP`,
`LIST_CLAUSE`, `COND_CLAUSE`.

### 3.3 SQL.Print — yazıcı

Ağacı dolaşıp satır listesi üretir.

**Seçenekler**

```
keywordCase      upper | lower | capitalize | preserve
identifierCase   preserve | lower | upper
indentUnit       "  " | "    " | "        " | "\t"
commaPosition    trailing | leading
columnsPerLine   1 | 2 | 4 | 'fit'
maxWidth         0 (sınırsız) | 80 | 100 | 120
alignAs          bool      breakAndOr    bool
onNewLine        bool      expandCase    bool
expandIn         bool      blankBetween  bool
parenSpacing     bool
```

**Giriş noktaları:** `format`, `minify`, `stripComments`, `normalize`, `inline`.

Temel yapı taşları:
- `Joiner` — boşluk kurallarını uygulayan metin birleştirici (tekil eksi,
  `(` öncesi/sonrası, `,` `;` `)` `.` özel durumları).
- `inline(nodes, o)` — ölçüm ve kısa gövdeler için tek satır üretir.
- `Out` — satır tamponu (`line`, `blank`, `appendToLast`, `fits`).
- `emitExpr(P, nodes, level, prefix, suffix)` — kırılma noktasına kadar
  biriktirir, sonra çok satırlı yapıyı açar.

### 3.4 SQL.Analyze

**Girdi biçimlendirilmiş metindir** — böylece ürettiği satır numaraları
kullanıcının gördüğü çıktı panosuyla birebir eşleşir.

Üretir: `stats` (ifade, tablo, join, cte, alt sorgu derinliği, satır, karakter),
`outline`, `tables` (her biri `tur` alanıyla), `notes`.

**Uyarılar:** `WHERE`'siz `UPDATE`/`DELETE`, `SELECT *`, `ON`'suz `JOIN`,
`NOT IN` + alt sorgu, `WHERE` içinde kolonu saran fonksiyon, `LIKE '%…'`,
dengesiz parantez, kapanmamış tırnak.

> `NOLOCK` için uyarı **üretilmez** — bilinçli bir üründür kararı.

**Tablo türleri:** `kalici`, `gecici` (`#`), `genel` (`##`), `degisken` (`@`),
`cte`. CTE adları, gövdeleri gezilmeden önce toplu hâlde kaydedilir.

### 3.5 SQL.Graph — ilişki çıkarımı

Sorguyu çizgeye çevirir: `{ nodes, edges }`.

**Kenar türleri:** `join`, `ortuk` (WHERE ile örtük birleştirme), `ilgili`
(alt sorgu korelasyonu), `capraz` (CROSS/APPLY), `kosulsuz` (ON'suz JOIN),
`besler` (CTE / türetilmiş tablo / `INSERT`/`SELECT INTO` veri akışı).

**Çekirdek kural:** Kenarların uçları, koşullardaki **takma adlar çözülerek**
bulunur (§4.9). Yalnızca iki tarafı da `alias.kolon` biçiminde olan eşitlikler
ilişki sayılır; fonksiyonla sarılı ya da sabitle karşılaştırılan koşullar kenar
üretmez.

Takma ad tabloları **kapsam zinciri** hâlinde tutulur (`{ adlar, ust }`);
çözümleme yukarı doğru yürür. Alt sorgudaki `WHERE i.mid = m.id` böylece
dıştaki `m`'ye ulaşır ve doğru kenarı üretir.

### 3.6 App.Store

IndexedDB birincil, localStorage yedek. `FileSystemHandle` **yalnızca
IndexedDB'de** saklanabilir. Her çağrı sessizce yedeğe düşer.

```js
App.Store = { get, set, del, hasFS }
hasFS = showDirectoryPicker && isSecureContext && location.protocol !== 'file:'
```

### 3.7 App.Shell

Sekmeler, canlı önizleme, renklendirme, cetveller, analiz paneli, bul & değiştir,
komut paleti, tema, kısayollar, taslak kaydı.

Diğer `App.*` katmanlarına açtığı yüzey: `girdi`, `girdiyeYaz`, `girdiyeEkle`,
`cikti`, `analiz`, `opts`, `flash`, `katmanAc`, `katmanKapat`, `aktifSekme`,
`sekmeAdlandir`, `yeniSekme`, `sekmeleriTazele`, `kaydetTaslak`, `calistir`,
`satiraGit`, `$`, `$$`.

Katmanlar arası iletişim `CustomEvent` ile: `kabuk:hazir`, `katman:ac`,
`kisayol:kaydet`.

### 3.8 App.Library

Diskte gerçek klasör: her sorgu kendi `.sql` dosyası, üst veri
`_kutuphane.json`. Klasör tanıtıcısı IndexedDB'de saklanır ve açılışta sessizce
yeniden bağlanılır. Etiket, arama, favori, `{{yer tutucu}}` şablonları, son 5
sürümün geçmişi, JSON dışa/içe aktarma.

### 3.9 App.Tools

Yedi araç, çekmece içinde sekmeli: Excel→IN, IN→VALUES/#temp, karşılaştırma
(LCS tabanlı), kod stringi (C#/Python/Java/JS/Go), parametreleştirme, toplu
yeniden adlandırma, dışa aktarma (Markdown/renkli HTML/düz metin).

### 3.10 App.Viz

Kuvvet tabanlı yerleşim (itme + yay + merkeze çekim), sürüklenebilir düğümler,
tekerlekle yakınlaştırma, boşluk sürükleyerek kaydırma, düğüm seçince komşuları
öne çıkarma, SVG indirme.

Renkler CSS değişkenlerinden okunup **öznitelik olarak** yazılır; indirilen SVG
tek başına da doğru görünür. Ekran etkileşimi için kullanılan sınıflar
(`vz-sonuk`, `vz-secili`) CSS'te tanımlıdır ve sunum özniteliklerini ezer.

---

## 4. Tuzaklar

> Bu bölümün her maddesi, inşa sırasında gerçekten yapılmış bir hatadır.

### 4.1 Kalıp eşleşmesinde satır sonu kontrolü
Çok kelimeli anahtar kelime aranırken "aradaki token'lar boş satırla ayrılmasın"
kontrolü **yalnızca devam token'larına** (`k > 0`) uygulanmalıdır. İlk token'a da
uygulanırsa, boş satırdan sonra gelen `BEGIN CATCH` eşleşmez ve blok yapısı
çöker. Biçimlendirmenin kendisi bu boş satırı ürettiği için hata ancak
**ikinci** biçimlendirmede ortaya çıkar — değişmezlik testi olmadan görülmez.

### 4.2 Fonksiyon mu, tablo mu?
`word` + `(` kalıbı tek başına yetmez: `INSERT INTO t (a, b)` yazımında `t`
fonksiyon sanılır ve `t(a, b)` diye yazılır. Ayırt edici bilgi **`(` öncesinde
boşluk olup olmadığıdır**. Kural: boşluk yoksa fonksiyon; boşluk varsa yalnızca
bilinen yerleşik fonksiyon adları (`COUNT`, `SUM`, `ROW_NUMBER`, …) fonksiyon
sayılır. Bu yüzden tokenizer `spaced` bilgisini taşımak zorundadır.

### 4.3 İfade sınırı yazarın satır sonlarına bağlanamaz
"Yeni ifade satır başındaysa başlar" varsayımı, tek satıra yazılmış
`select 1 select 2` gibi girdilerde çöker ve — daha kötüsü — biçimlendirme satır
sonu eklediği için ikinci geçişte farklı sonuç üretir. Sınır, keyword'ün kendisi
ve bağlamıyla belirlenmelidir: `CONTINUES` kümesi (`UNION`, `AS`, `THEN`,
`GRANT`, …) ve bağlama duyarlı bastırma kuralları (`INSERT`…`SELECT`,
`UPDATE`…`SET`, `OFFSET`…`FETCH`, `MERGE` gövdesi).

### 4.4 `WITH` iki farklı şey
`WITH` hem CTE başlangıcıdır hem tablo ipucudur (`FROM t WITH (NOLOCK)`). İfade
ortasındaki `WITH` **asla** yeni ifade başlatmaz.

### 4.5 Parantez kapanınca önceki keyword unutulmalı
`FROM t WITH (NOLOCK)` yazımından sonra `prevKw` hâlâ `WITH` kalırsa — ve `WITH`
`CONTINUES` içindeyse — sonraki ifade ayrılmaz, iki sorgu tek ifadeye yapışır.
Üst düzeyde bir `)` kapandığında `prevKw` sıfırlanmalıdır.

### 4.6 Noktalı virgül tek bir yerde eklenmeli
`;` her ifade türünün kendi dalında eklenirse, dallardan biri (`Cte`, `If`)
unutulur ve **token kaybolur**. `switch` bittikten sonra tek bir yerde
eklenmelidir. Bu, "bozulmama" testinin yakaladığı gerçek bir veri kaybıdır.

### 4.7 Satır yorumu satırın geri kalanını yutar
`SELECT a, -- not` yazımında yorum, kendisinden sonra aynı satıra yazılan her
şeyi yorum içinde bırakır. İki sonucu vardır:
1. Bir liste öğesi satır yorumu içeriyorsa **tüm liste** satır başına bir öğe
   olarak yazılmalıdır — yoksa `a, -- not b` üretilir ve `b` kaybolur.
2. Virgülden sonra gelen yorum, öğenin **kuyruğunda** ayrı tutulmalıdır; öğenin
   içine konursa virgül yorumdan sonra yazılır (`a -- not,`) ve sorgu bozulur.

### 4.8 `preserve` kipi ham metin ister
Anahtar kelimeye dokunmama kipinde, yan tümce düğümleri kanonik ad (`SELECT`)
değil **kaynaktaki yazım** (`SeLeCt`) ile yazılmalıdır. Bu yüzden `Clause`,
`Join`, `SetOp`, `Block`, `If` düğümleri `raw` alanı taşır.

### 4.9 Çizge kenarları zincire göre kurulamaz
"Her `JOIN` bir önceki tabloya bağlanır" varsayımı yanlış diyagram üretir:

```sql
FROM a JOIN b ON 1=1 JOIN c ON c.aid = a.id
```

Burada `c`, `b`'ye değil `a`'ya bağlıdır. Kenarlar `ON`/`WHERE` koşullarındaki
takma adlar çözülerek kurulmalı; ancak hiçbir çift çözülemezse zincire
düşülmelidir.

### 4.10 Kaynaklar hedeflerden önce çözülmeli
`UPDATE m SET … FROM musteri m` yazımında `m`, `FROM`'daki tablonun takma adıdır,
ayrı bir tablo değil. `UPDATE` yan tümcesi metinde önce geldiği için, önce
işlenirse üç düğüm üretilir. Sıra: önce `FROM`/`JOIN`/`USING`, sonra hedefler —
ve hedef zaten çözülebiliyorsa yeni düğüm açılmaz.

### 4.11 Alt sorgular iki kez gezilmemeli
`FROM (SELECT …) d` içindeki tablolar, hem kaynak çözümlemesinde hem genel alt
sorgu taramasında ele alınırsa düğümler ikiye katlanır. Genel tarama, kaynak ve
hedef yan tümcelerini atlamalıdır.

### 4.12 Ana hatta CTE'nin ana sorgusu
`Cte` düğümünün `line` alanı `WITH`'in satırıdır. Ana sorgunun ana hat girdisi
bu satırı gösterirse, kullanıcı tıkladığında yanlış yere atlar. Ana sorgunun
**kendi ilk yan tümcesinin** satırı kullanılmalıdır.

### 4.13 Anahtar kelime olan tablo ipuçları
`NOLOCK` `KEYWORDS` içinde olduğu için çözümleyici onu `Kw` düğümü yapar, `Tok`
değil. `Tok` arayan kontroller onu asla bulamaz.

### 4.14 Esnek kutuda daralma
`display:flex` içindeki bir çocuğun içeriğinden küçülebilmesi için
`min-height:0` (ya da `min-width:0`) gerekir. Yoksa panel kutusundan taşar ve
altındaki öğenin üstüne biner. Ayrıca kapsayıcıya `overflow:hidden` verilmesi,
taşmanın hiçbir koşulda görünmemesini garanti eder.

### 4.15 Sığdırma gerçek boyutu kullanmalı
Yerleşim simülasyonu için pano boyutuna alt sınır uygulanabilir (dar panolarda
düğümler sıkışmasın diye). Ama **sığdırma** bu alt sınırı kullanırsa, görünenden
büyük bir alana göre ölçek hesaplar ve düğümler ekran dışında kalır. İki ölçü
ayrı fonksiyonlar olmalıdır.

### 4.16 Sığdırma en sona
Gösterge (legend) doldukça satır sayısı artar ve pano kısalır. Sığdırma bundan
önce hesaplanırsa ölçek olduğundan büyük çıkar ve alttaki düğümler kırpılır.

### 4.17 File System Access API ve `file://`
Chrome, `file://` üzerinde `isSecureContext` için `true` döndürür ama
`showDirectoryPicker()` `SecurityError` atar. Protokol ayrıca kontrol
edilmezse, kullanıcıya tıklayınca patlayan bir düğme gösterilir.

### 4.18 Depolama anahtarları yeniden adlandırmayı hayatta kalmalı
Uygulama adı değişince IndexedDB adı ve localStorage öneki **değiştirilmemeli**;
aksi hâlde kullanıcıların mevcut taslakları ve kütüphaneleri erişilemez olur.

### 4.19 Test koşucusunda iframe yarışı
`iframe.addEventListener('load', …)` dinleyicisi, iframe önbellekten yüklenmişse
hiç tetiklenmez ve testler **sessizce hiç çalışmaz**. `readyState` ayrıca
yoklanmalıdır. Bu, "testler yeşil" sanılırken hiç koşmamasına yol açan sinsi
bir hatadır.

---

## 5. Test stratejisi

`tests.html`, `index.html`'i **gizli bir iframe** içinde yükler ve motora
`iframe.contentWindow.SQL` üzerinden erişir. Kod kopyalanmaz, `eval`
kullanılmaz, tek dosya bütünlüğü bozulmaz.

### Üç değişmez

Her biçimlendirici fixture'ı şunlardan geçer:

| Kontrol | İfade | Ne yakalar |
|---|---|---|
| **Beklenen çıktı** | `format(x) === bekle` | Biçim gerilemeleri |
| **Değişmezlik** | `format(format(x)) === format(x)` | Kararsız biçimlendirme |
| **Bozulmama** | `minify(format(x)) === minify(x)` | **Token kaybı / anlam değişimi** |

Üçüncüsü en değerlisidir: biçimlendirmenin sorgunun anlamını değiştiremeyeceğini
garanti eder. Noktalı virgül kaybı (§4.6) ve yorumun kolonu yutması (§4.7) bu
testle yakalanmıştır.

Ayrıca her fixture **16 farklı seçenek kombinasyonunda** hata atmadan ve kararlı
çalışmalıdır.

Bilinçli istisnalar `atla: ['bozulmama']` ile işaretlenir (örneğin boş
ifadelerin — `;;;` — düşürülmesi).

### Çizge testleri

`GRAPH_CASES` ayrı çalışır: her sorgu için beklenen düğüm ve kenar kümesi
**sırasız** karşılaştırılır. Kenar uçları alfabetik sıraya alınır, çünkü yön
yalnızca `besler` türünde anlamlıdır.

### Kapsam

Basit `SELECT`; çok kolonlu liste + `AS` hizalama; üç seviye iç içe alt sorgu;
zincirli CTE; iç içe `CASE`; çoklu `JOIN`; `UNION ALL`; pencere fonksiyonu;
`MERGE`; `TRY/CATCH`; `GO` batch; her konumda yorum; kaçışlı metin (`'it''s'`);
köşeli parantez tanımlayıcı; Unicode; bozuk ve kapanmamış girdiler; 20 çizge
vakası. **Toplam 85.**

### Yerel çalıştırma

```bash
python3 -m http.server 8000
```

`http://localhost:8000/tests.html` — klasöre yazma güvenli bağlam istediği için
geliştirirken `file://` yerine `localhost` kullanılmalıdır.

---

## 6. Yapım sırası

Bu sıra bağımlılıklara göredir; atlanmamalıdır.

1. **İskelet** — HTML yapısı, CSS tokenları, açık/koyu tema, iki panel düzeni.
2. **`SQL.Lex`** — konum bilgisi, `nl`/`spaced`, yorum bağlama yönü, kapanmamış
   sabitler.
3. **`tests.html` + ilk fixture'lar** — motor daha yazılmadan koşucu hazır olsun.
4. **`SQL.Parse`** — `Raw` geri düşüşüyle. Hiçbir girdide hata atmamalı.
5. **`SQL.Print`** — ağırlık burada. Önce temel yapı, sonra sarma ve `AS`
   hizalama. Her adımda üç değişmez koşulmalı.
6. **`SQL.Analyze`** + analiz paneli.
7. **`App.Shell`** — editör, sekmeler, kısayollar, tema.
8. **`App.Store` + `App.Library`** — IndexedDB, klasör bağlama.
9. **`App.Tools`** — Excel→IN önce (en çok kullanılan).
10. **`SQL.Graph`** — çizge testleriyle birlikte.
11. **`App.Viz`** — yerleşim, çizim, etkileşim.
12. **Repo + Pages.**

---

## 7. Yayın

Derleme adımı olmadığı için CI yalnızca depo içeriğini GitHub Pages'e taşır
(`actions/upload-pages-artifact` + `actions/deploy-pages`, `path: .`).

**Public repo gerekir** — private depolarda Pages yalnızca ücretli planlarda
çalışır.

İki kullanım yolu desteklenmelidir:

| Yol | Origin | Kütüphane |
|---|---|---|
| Pages linki | güvenli | Klasöre `.sql` yazar, izin kalıcı |
| `index.html`'e çift tıkla | `file://` | localStorage + JSON dışa aktarma |

---

## 8. Kabul ölçütleri

- [ ] `tests.html` üzerinde **85/85** yeşil, hem `localhost` hem yayınlanmış adreste
- [ ] Konsolda hata yok
- [ ] DevTools → Network'te **sıfır** istek
- [ ] `file://` ile açıldığında uygulama çalışıyor, klasör düğmesi gizli
- [ ] Gerçek bir üretim sorgusu (CTE + `CASE` + alt sorgu + 5 JOIN) doğru
      biçimleniyor, iki kez biçimlendirilince değişmiyor
- [ ] Şemada `FROM a JOIN b ON 1=1 JOIN c ON c.aid=a.id` kenarı `c`–`a` arasında
- [ ] Sayfa yeniden yüklendiğinde taslak, sekmeler, tema ve kütüphane geri geliyor
