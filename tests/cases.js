/* ============================================================
   Test fixture'ları
   Her vaka: { ad, sql, opt?, bekle? }
   'bekle' verilmezse yalnızca sağlamlık kontrolleri (değişmezlik,
   bozulmama, hata atmama) uygulanır.
   ============================================================ */
window.CASES = [
  {
    ad: 'Basit SELECT',
    sql: 'select id, ad from musteri where aktif=1',
    bekle: [
      'SELECT',
      '    id,',
      '    ad',
      'FROM musteri',
      'WHERE aktif = 1'
    ].join('\n')
  },
  {
    ad: 'Tek kolon tek satırda kalır',
    sql: 'select count(*) from siparis',
    bekle: 'SELECT COUNT(*)\nFROM siparis'
  },
  {
    ad: 'AND/OR kırılımı',
    sql: "select a from t where x=1 and y=2 or z=3",
    bekle: [
      'SELECT a',
      'FROM t',
      'WHERE x = 1',
      '    AND y = 2',
      '    OR z = 3'
    ].join('\n')
  },
  {
    ad: 'JOIN ve ON',
    sql: 'select s.id, m.ad from siparis s inner join musteri m on m.id = s.musteri_id left join adres a on a.musteri_id = m.id',
    bekle: [
      'SELECT',
      '    s.id,',
      '    m.ad',
      'FROM siparis s',
      'INNER JOIN musteri m',
      '    ON m.id = s.musteri_id',
      'LEFT JOIN adres a',
      '    ON a.musteri_id = m.id'
    ].join('\n')
  },
  {
    ad: 'CASE bloğu',
    sql: "select case when tutar>100 then 'yuksek' when tutar>50 then 'orta' else 'dusuk' end as seviye from siparis",
    bekle: [
      'SELECT',
      '    CASE',
      "        WHEN tutar > 100 THEN 'yuksek'",
      "        WHEN tutar > 50 THEN 'orta'",
      "        ELSE 'dusuk'",
      '    END AS seviye',
      'FROM siparis'
    ].join('\n')
  },
  {
    ad: 'İç içe CASE',
    sql: "select case when a=1 then case when b=2 then 'x' else 'y' end else 'z' end from t"
  },
  {
    ad: 'Alt sorgu',
    sql: 'select * from (select id from t where x=1) as k',
    bekle: [
      'SELECT *',
      'FROM (',
      '    SELECT id',
      '    FROM t',
      '    WHERE x = 1',
      ') AS k'
    ].join('\n')
  },
  {
    ad: 'IN alt sorgu',
    sql: 'select a from t where id in (select id from u where aktif=1)',
    bekle: [
      'SELECT a',
      'FROM t',
      'WHERE id IN (',
      '    SELECT id',
      '    FROM u',
      '    WHERE aktif = 1',
      ')'
    ].join('\n')
  },
  {
    ad: 'CTE zinciri',
    sql: 'with a as (select 1 as x), b as (select 2 as y) select * from a join b on 1=1',
    bekle: [
      'WITH a AS (',
      '    SELECT 1 AS x',
      '),',
      'b AS (',
      '    SELECT 2 AS y',
      ')',
      'SELECT *',
      'FROM a',
      'JOIN b',
      '    ON 1 = 1'
    ].join('\n')
  },
  {
    ad: 'UNION ALL',
    sql: 'select a from t1 union all select a from t2 union select a from t3',
    bekle: [
      'SELECT a',
      'FROM t1',
      'UNION ALL',
      'SELECT a',
      'FROM t2',
      'UNION',
      'SELECT a',
      'FROM t3'
    ].join('\n')
  },
  {
    ad: 'Pencere fonksiyonu',
    sql: 'select ad, row_number() over (partition by grup order by tarih desc) as sira from t',
    bekle: [
      'SELECT',
      '    ad,',
      '    ROW_NUMBER() OVER (PARTITION BY grup ORDER BY tarih DESC) AS sira',
      'FROM t'
    ].join('\n')
  },
  {
    ad: 'GROUP BY / HAVING / ORDER BY',
    sql: 'select grup, sum(tutar) as toplam from siparis group by grup having sum(tutar)>1000 order by toplam desc',
    bekle: [
      'SELECT',
      '    grup,',
      '    SUM(tutar) AS toplam',
      'FROM siparis',
      'GROUP BY grup',
      'HAVING SUM(tutar) > 1000',
      'ORDER BY toplam DESC'
    ].join('\n')
  },
  {
    ad: 'INSERT INTO ... VALUES',
    sql: "insert into t (a,b) values (1,'x')",
    bekle: "INSERT INTO t (a, b)\nVALUES (1, 'x')"
  },
  {
    ad: 'INSERT ... SELECT tek ifade kalır',
    sql: 'insert into hedef (a)\nselect a from kaynak'
  },
  {
    ad: 'UPDATE ... SET',
    sql: 'update t set a=1, b=2 where id=5',
    bekle: [
      'UPDATE t',
      'SET',
      '    a = 1,',
      '    b = 2',
      'WHERE id = 5'
    ].join('\n')
  },
  {
    ad: 'DELETE',
    sql: 'delete from t where id=5',
    bekle: 'DELETE FROM t\nWHERE id = 5'
  },
  {
    ad: 'BEGIN ... END bloğu',
    sql: 'begin select 1 select 2 end',
    bekle: [
      'BEGIN',
      '    SELECT 1',
      '',
      '    SELECT 2',
      'END'
    ].join('\n')
  },
  {
    ad: 'IF / ELSE',
    sql: 'if @x = 1 begin select 1 end else begin select 2 end',
    bekle: [
      'IF @x = 1',
      'BEGIN',
      '    SELECT 1',
      'END',
      'ELSE',
      'BEGIN',
      '    SELECT 2',
      'END'
    ].join('\n')
  },
  {
    ad: 'TRY / CATCH',
    sql: 'begin try select 1 end try begin catch select error_message() end catch'
  },
  {
    ad: 'GO ile batch ayrımı',
    sql: 'select 1\ngo\nselect 2',
    bekle: 'SELECT 1\n\nGO\n\nSELECT 2'
  },
  {
    ad: 'Köşeli parantez tanımlayıcı',
    sql: 'select [ad soyad], [t].[x] from [dbo].[musteri] as [t]',
    bekle: [
      'SELECT',
      '    [ad soyad],',
      '    [t].[x]',
      'FROM [dbo].[musteri] AS [t]'
    ].join('\n')
  },
  {
    ad: 'Kaçışlı metin sabiti',
    sql: "select 'it''s ok' as x, N'türkçe' as y from t",
    bekle: [
      'SELECT',
      "    'it''s ok' AS x,",
      "    N'türkçe' AS y",
      'FROM t'
    ].join('\n')
  },
  {
    ad: 'Metin içindeki anahtar kelime bozulmaz',
    sql: "select 'select * from where' as s from t",
    bekle: "SELECT 'select * from where' AS s\nFROM t"
  },
  {
    ad: 'Satır sonu yorumu',
    sql: 'select a, -- kolon notu\n b from t'
  },
  {
    ad: 'Tek başına yorum',
    sql: '-- basliktaki not\nselect a from t',
    bekle: '-- basliktaki not\nSELECT a\nFROM t'
  },
  {
    ad: 'Blok yorum',
    sql: '/* aciklama */ select a from t'
  },
  {
    ad: 'Değişkenler ve geçici tablo',
    sql: 'declare @x int = 5 select * into #tmp from t where id=@x'
  },
  {
    ad: 'Negatif sayı ve operatörler',
    sql: 'select -1, a*-2, b - 3, c*(d+e) from t',
    bekle: [
      'SELECT',
      '    -1,',
      '    a * -2,',
      '    b - 3,',
      '    c * (d + e)',
      'FROM t'
    ].join('\n')
  },
  {
    ad: 'TOP ve DISTINCT',
    sql: 'select distinct top 10 ad from musteri',
    bekle: 'SELECT DISTINCT TOP 10 ad\nFROM musteri'
  },
  {
    ad: 'MERGE',
    sql: 'merge into hedef as h using kaynak as k on h.id=k.id when matched then update set h.a=k.a when not matched then insert (a) values (k.a);'
  },
  {
    ad: 'NOLOCK ipucu',
    sql: 'select a from t with (nolock) where x=1'
  },
  {
    ad: 'CREATE TABLE',
    sql: 'create table t (id int not null primary key, ad nvarchar(50) null)'
  },
  {
    ad: 'EXISTS',
    sql: 'select a from t where exists (select 1 from u where u.id=t.id)'
  },
  {
    ad: 'OFFSET / FETCH',
    sql: 'select a from t order by a offset 10 rows fetch next 20 rows only'
  },
  {
    ad: 'Çoklu ifade noktalı virgülle',
    sql: 'select 1; select 2;',
    bekle: 'SELECT 1;\n\nSELECT 2;'
  },
  {
    ad: 'Boş girdi',
    sql: '',
    bekle: ''
  },
  {
    ad: 'Sadece yorum',
    sql: '-- yalnizca not',
    bekle: '-- yalnizca not'
  },
  {
    ad: 'Bozuk sorgu çökmemeli',
    sql: 'select from where (((('
  },
  {
    ad: 'Kapanmamış tırnak çökmemeli',
    sql: "select 'acik metin from t"
  },
  {
    ad: 'Anlamsız metin çökmemeli',
    sql: 'bu bir sql degil sadece rastgele kelimeler ???'
  }
];


/* ---- İkinci dalga: gerçek dünyadan gelen kenar durumlar ---- */
window.CASES.push(
  {
    ad: 'Fonksiyon adı ile tablo adı ayrımı',
    sql: 'insert into t (a,b) select count(*), sum(x) from u',
    bekle: [
      'INSERT INTO t (a, b)',
      'SELECT',
      '    COUNT(*),',
      '    SUM(x)',
      'FROM u'
    ].join('\n')
  },
  {
    ad: 'WITH (NOLOCK) tablo ipucu bölünmez',
    sql: 'select a from dbo.t with (nolock) where x=1',
    bekle: "SELECT a\nFROM dbo.t WITH (NOLOCK)\nWHERE x = 1"
  },
  {
    ad: 'Noktalı virgül CTE sonunda korunur',
    sql: 'with c as (select 1 x) select * from c;',
    bekle: [
      'WITH c AS (',
      '    SELECT 1 x',
      ')',
      'SELECT *',
      'FROM c;'
    ].join('\n')
  },
  {
    ad: 'BEGIN CATCH boş satırdan sonra tanınır',
    sql: 'begin try\n  select 1\nend try\n\nbegin catch\n  select 2\nend catch',
    bekle: [
      'BEGIN TRY',
      '    SELECT 1',
      'END TRY',
      '',
      'BEGIN CATCH',
      '    SELECT 2',
      'END CATCH'
    ].join('\n')
  },
  {
    ad: 'JOIN ON çoklu koşul aynı seviyede',
    sql: 'select a from t join u on u.id=t.id and u.aktif=1',
    bekle: [
      'SELECT a',
      'FROM t',
      'JOIN u',
      '    ON u.id = t.id',
      '    AND u.aktif = 1'
    ].join('\n')
  },
  {
    ad: 'Satır yorumu kolonu yutmaz',
    sql: 'select a, -- not\n b from t',
    opt: { columnsPerLine: 'fit', maxWidth: 80 },
    bekle: [
      'SELECT',
      '    a, -- not',
      '    b',
      'FROM t'
    ].join('\n')
  },
  {
    ad: 'Satır sonu olmadan ardışık ifadeler',
    sql: 'declare @x int = 5 select 1 print @x',
    bekle: [
      'DECLARE @x INT = 5',
      '',
      'SELECT 1',
      '',
      'PRINT @x'
    ].join('\n')
  },
  {
    ad: 'CREATE VIEW AS SELECT bölünmez',
    sql: 'create view v as select a from t'
  },
  {
    ad: 'OFFSET/FETCH tek ifade kalır',
    sql: 'select a from t order by a offset 10 rows fetch next 5 rows only',
    bekle: [
      'SELECT a',
      'FROM t',
      'ORDER BY a',
      'OFFSET 10 ROWS',
      'FETCH NEXT 5 ROWS ONLY'
    ].join('\n')
  },
  {
    ad: 'GRANT SELECT bölünmez',
    sql: 'grant select on dbo.t to kullanici'
  },
  {
    ad: 'IN listesi açılmış',
    sql: "select a from t where x in (1,2,3)",
    opt: { expandIn: true },
    bekle: [
      'SELECT a',
      'FROM t',
      'WHERE x IN (',
      '    1,',
      '    2,',
      '    3',
      ')'
    ].join('\n')
  },
  {
    ad: 'AS hizalama',
    sql: 'select a as x, uzuncakolonadi as y, b as z from t',
    opt: { alignAs: true },
    bekle: [
      'SELECT',
      '    a              AS x,',
      '    uzuncakolonadi AS y,',
      '    b              AS z',
      'FROM t'
    ].join('\n')
  },
  {
    ad: 'Başta virgül',
    sql: 'select a, b, c from t',
    opt: { commaPosition: 'leading' },
    bekle: [
      'SELECT',
      '    a',
      '    , b',
      '    , c',
      'FROM t'
    ].join('\n')
  },
  {
    ad: 'Çoklu VALUES satırı',
    sql: "insert into t (a,b) values (1,'x'),(2,'y')",
    bekle: [
      'INSERT INTO t (a, b)',
      'VALUES',
      "    (1, 'x'),",
      "    (2, 'y')"
    ].join('\n')
  },
  {
    ad: 'İç içe alt sorgu üç seviye',
    sql: 'select a from (select b from (select c from t) x) y'
  },
  {
    ad: 'CASE içinde alt sorgu',
    sql: 'select case when exists (select 1 from u) then 1 else 0 end as v from t'
  },
  {
    ad: 'WHILE döngüsü',
    sql: 'while @i < 10 begin set @i = @i + 1 end'
  },
  {
    ad: 'ELSE IF zinciri',
    sql: 'if @x=1 select 1 else if @x=2 select 2 else select 3'
  },
  {
    ad: 'Çok uzun kolon listesi sığdırma',
    sql: 'select a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15 from t',
    opt: { columnsPerLine: 'fit', maxWidth: 40 }
  },
  {
    ad: 'Karışık büyük/küçük harf korunur',
    sql: 'SeLeCt Ad, SoyAd FrOm Musteri',
    opt: { keywordCase: 'preserve', identifierCase: 'preserve' },
    bekle: 'SeLeCt\n    Ad,\n    SoyAd\nFrOm Musteri'
  },
  {
    ad: 'Blok yorum ifadeler arasında',
    sql: 'select 1;\n/* ayirici */\nselect 2;'
  },
  {
    ad: 'Tırnaklı tanımlayıcı içindeki nokta',
    sql: 'select [a.b].c from [x.y] as [a.b]'
  },
  {
    ad: 'Unicode tanımlayıcılar',
    sql: 'select müşteri_adı, şehir from müşteriler where ülke = N\'TR\''
  },
  {
    /* Boş ifadeler bilinçli olarak atılır — bozulmama kontrolünden muaf */
    ad: 'Sadece noktalı virgüller',
    sql: ';;;',
    bekle: '',
    atla: ['bozulmama']
  },
  {
    ad: 'Çok derin parantez çökmemeli',
    sql: 'select ' + new Array(60).join('(') + '1' + new Array(60).join(')') + ' from t'
  }
);

/* Seçenek varyasyonları — hepsi tüm vakalarda sağlamlık için denenir */
window.OPT_SETS = [
  { ad: 'varsayılan', opt: {} },
  { ad: 'küçük harf', opt: { keywordCase: 'lower' } },
  { ad: 'baş harf', opt: { keywordCase: 'capitalize' } },
  { ad: 'dokunma', opt: { keywordCase: 'preserve' } },
  { ad: '2 boşluk', opt: { indentUnit: '  ' } },
  { ad: 'tab', opt: { indentUnit: '\t' } },
  { ad: 'başta virgül', opt: { commaPosition: 'leading' } },
  { ad: '4 kolon/satır', opt: { columnsPerLine: 4 } },
  { ad: 'sığdır 80', opt: { columnsPerLine: 'fit', maxWidth: 80 } },
  { ad: 'AS hizala', opt: { alignAs: true } },
  { ad: 'IN aç', opt: { expandIn: true } },
  { ad: 'CASE kapalı', opt: { expandCase: false } },
  { ad: 'AND/OR kırma', opt: { breakAndOr: false } },
  { ad: 'ON satır içi', opt: { onNewLine: false } },
  { ad: 'parantez boşluğu', opt: { parenSpacing: true } },
  { ad: 'boş satır yok', opt: { blankBetween: false } }
];

/* ============================================================
   Çizge (tablo / join ilişkisi) vakaları
   Kenarlar "A —tür→ B" biçiminde yazılır; karşılaştırma sırasızdır
   ve uçlar alfabetik sıraya alınır, çünkü kenarın yönü yalnızca
   'besler' türünde anlamlıdır.
   ============================================================ */
window.GRAPH_CASES = [
  {
    ad: 'Zincir dışı ON doğru tabloya bağlanır',
    sql: 'select * from a join b on 1=1 join c on c.aid=a.id',
    dugumler: ['a', 'b', 'c'],
    kenarlar: ['a—join—b', 'a—join—c']
  },
  {
    ad: 'Çok koşullu JOIN tek kenar',
    sql: 'select * from a join b on a.id=b.aid and a.tip=b.tip',
    dugumler: ['a', 'b'],
    kenarlar: ['a—join—b']
  },
  {
    ad: 'Eski usul WHERE birleştirmesi',
    sql: 'select * from a, b where a.id=b.aid and b.x=1',
    dugumler: ['a', 'b'],
    kenarlar: ['a—ortuk—b']
  },
  {
    ad: 'CROSS JOIN çapraz sayılır',
    sql: 'select * from a cross join b',
    dugumler: ['a', 'b'],
    kenarlar: ['a—capraz—b']
  },
  {
    ad: 'ON olmadan JOIN koşulsuz işaretlenir',
    sql: 'select * from a join b',
    dugumler: ['a', 'b'],
    kenarlar: ['a—kosulsuz—b']
  },
  {
    ad: 'CTE ayrı düğüm, gövdesi onu besler',
    sql: 'with x as (select a from t1 join t2 on t2.id=t1.id) select * from x join t3 on t3.id=x.a',
    dugumler: ['t1', 't2', 't3', 'x'],
    kenarlar: ['t1—besler—x', 't1—join—t2', 't2—besler—x', 't3—join—x']
  },
  {
    ad: 'Türetilmiş tablo bir kez sayılır',
    sql: 'select * from (select id from t1) d join t2 on t2.id=d.id',
    dugumler: ['d', 't1', 't2'],
    kenarlar: ['d—besler—t1', 'd—join—t2']
  },
  {
    ad: 'Korelasyon dıştaki tabloya bağlanır',
    sql: 'select (select count(*) from iade i where i.mid=m.id) from musteri m join siparis s on s.mid=m.id',
    dugumler: ['iade', 'musteri', 'siparis'],
    kenarlar: ['iade—ilgili—musteri', 'musteri—join—siparis']
  },
  {
    ad: 'EXISTS korelasyonu',
    sql: 'select * from musteri m where exists (select 1 from abonelik ab where ab.mid=m.id)',
    dugumler: ['abonelik', 'musteri'],
    kenarlar: ['abonelik—ilgili—musteri']
  },
  {
    ad: 'Kendine birleştirme iki düğüm üretir',
    sql: 'select * from calisan e join calisan y on y.id=e.yonetici_id',
    dugumler: ['calisan', 'calisan'],
    kenarlar: ['calisan—join—calisan']
  },
  {
    ad: 'UPDATE hedefi FROM tablosuyla aynı düğüm',
    sql: 'update m set m.x=1 from musteri m join siparis s on s.mid=m.id',
    dugumler: ['musteri', 'siparis'],
    kenarlar: ['musteri—join—siparis']
  },
  {
    ad: 'SELECT INTO veri akışı üretir',
    sql: 'select * into #tmp from siparis s join musteri m on m.id=s.mid',
    dugumler: ['#tmp', 'musteri', 'siparis'],
    kenarlar: ['#tmp—besler—musteri', '#tmp—besler—siparis', 'musteri—join—siparis']
  },
  {
    ad: 'INSERT ... SELECT veri akışı',
    sql: 'insert into hedef (a) select a from kaynak k join ek e on e.id=k.id',
    dugumler: ['ek', 'hedef', 'kaynak'],
    kenarlar: ['ek—besler—hedef', 'ek—join—kaynak', 'hedef—besler—kaynak']
  },
  {
    ad: 'MERGE eşleştirme koşulu',
    sql: 'merge into hedef as h using kaynak as k on h.id=k.id when matched then update set h.a=k.a',
    dugumler: ['hedef', 'kaynak'],
    kenarlar: ['hedef—join—kaynak']
  },
  {
    ad: 'Fonksiyonla sarılı koşul ilişki sayılmaz',
    sql: 'select * from a join b on upper(a.id)=b.aid',
    dugumler: ['a', 'b'],
    kenarlar: ['a—join—b']
  },
  {
    ad: 'Sabitle karşılaştırma kenar üretmez',
    sql: 'select * from a where a.x = 5',
    dugumler: ['a'],
    kenarlar: []
  },
  {
    ad: 'FROM yoksa çizge boş',
    sql: 'select 1 + 1',
    dugumler: [],
    kenarlar: []
  },
  {
    ad: 'Bozuk sorguda çökmez',
    sql: 'select from where ((((',
    dugumler: [],
    kenarlar: []
  },
  {
    ad: 'Geçici tablo türleri ayrışır',
    sql: 'select * from #yerel y join ##genel g on g.id=y.id join @degisken d on d.id=y.id',
    dugumler: ['##genel', '#yerel', '@degisken'],
    kenarlar: ['##genel—join—#yerel', '#yerel—join—@degisken']
  },
  {
    ad: 'İç içe türetilmiş tablolar zincirlenir',
    sql: 'select * from (select * from (select id from derin) o) d join t2 on t2.id=d.id',
    dugumler: ['d', 'derin', 'o', 't2'],
    kenarlar: ['d—besler—o', 'd—join—t2', 'derin—besler—o']
  }
];
