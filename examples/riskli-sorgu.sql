-- Analiz panelinin yakaladığı tipik sorunları içerir:
-- WHERE'siz UPDATE, SELECT *, ON'suz JOIN, NOT IN + NULL tuzağı,
-- kolonu saran fonksiyon ve baştan joker.
update dbo.musteri set aktif = 0;

select *
from dbo.siparis s
join dbo.musteri m
where year(s.tarih) = 2024
  and m.ad like '%ltd%'
  and s.id not in (select siparis_id from dbo.iptal);
