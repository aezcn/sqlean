-- Blok yapıları: TRY/CATCH, IF/ELSE, WHILE, MERGE ve GO batch ayracı
begin try
declare @i int = 0
while @i < 10 begin set @i = @i + 1 if @i = 5 begin print 'yarida' continue end end
merge into hedef as h using kaynak as k on h.id = k.id
when matched then update set h.tutar = k.tutar
when not matched then insert (id, tutar) values (k.id, k.tutar);
end try
begin catch
if error_number() = 2627 print N'yinelenen kayıt' else throw
end catch
go
select 'ikinci batch' as not;
