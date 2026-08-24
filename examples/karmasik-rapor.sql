-- Aylık müşteri cirosu, segment dağılımı ve iade sayısı
-- Biçimlendiriciyi CTE, CASE, pencere fonksiyonu ve alt sorgu ile sınar.
with aylik as (select musteri_id, datefromparts(year(tarih),month(tarih),1) as ay,
sum(tutar) as tutar from dbo.siparis with (nolock) where tarih >= '2024-01-01'
and iptal = 0 group by musteri_id, datefromparts(year(tarih),month(tarih),1)),
sirali as (select a.*, row_number() over (partition by a.musteri_id order by a.tutar desc) as rn from aylik a)
select m.[ad soyad] as musteri, s.ay, s.tutar,
case when s.tutar > 10000 then N'altın' when s.tutar > 5000 then N'gümüş' else N'standart' end as segment,
(select count(*) from dbo.iade i where i.musteri_id = m.id) as iade_sayisi
from sirali s inner join dbo.musteri m on m.id = s.musteri_id and m.aktif = 1
left outer join dbo.adres ad on ad.musteri_id = m.id and ad.tip = 'fatura'
where s.rn <= 3 and m.ulke in ('TR','DE','NL') and exists (select 1 from dbo.abonelik ab where ab.musteri_id = m.id)
order by s.ay desc, s.tutar desc;
