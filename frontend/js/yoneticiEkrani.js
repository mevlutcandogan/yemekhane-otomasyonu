window.YoneticiEkrani = {
  async goster(kapsayici, durum) {
    kapsayici.innerHTML = '<h1>Yönetici Paneli</h1><p class="alt-metin">Yönetici verileri yükleniyor…</p>';

    try {
      const [yemekVeri, kullaniciVeri] = await Promise.all([
        Api.istek('/yonetici/yemekler'),
        Api.istek('/yonetici/kullanicilar')
      ]);

      const yemekhaneSecenek = durum.meta.yemekhaneler
        .map((y) => `<option value="${y.id}">${Yardimci.esc(y.ad)}</option>`)
        .join('');
      const ogunSecenek = durum.meta.ogunler
        .map((o) => `<option value="${o.id}">${Yardimci.esc(o.ad)}</option>`)
        .join('');
      const yemekKutulari = yemekVeri.yemekler
        .map((y) => `
          <label class="secim-satir">
            <input type="checkbox" name="yemek_id" value="${y.id}">
            <span><strong>${Yardimci.esc(y.kategori)}:</strong> ${Yardimci.esc(y.ad)} (${Yardimci.esc(y.kalori)} kcal)</span>
          </label>`)
        .join('');
      const kullaniciSecenek = kullaniciVeri.kullanicilar
        .map((k) => `<option value="${k.id}">${Yardimci.esc(k.ad)} ${Yardimci.esc(k.soyad)} (${Yardimci.esc(k.rol)})</option>`)
        .join('');

      kapsayici.innerHTML = `
        <h1>Yönetici Paneli</h1>

        <section class="kart">
          <h2 id="menu-form-baslik">Menü Oluştur</h2>
          <form id="yonetici-menu-form">
            <input type="hidden" id="duzenlenen-menu-id" value="">
            <div class="filtre-satiri">
              <div class="form-grup">
                <label for="ym-yemekhane">Yemekhane</label>
                <select id="ym-yemekhane" required>${yemekhaneSecenek}</select>
              </div>
              <div class="form-grup">
                <label for="ym-tarih">Tarih</label>
                <input id="ym-tarih" type="date" value="${Yardimci.bugunIso()}" required>
              </div>
              <div class="form-grup">
                <label for="ym-ogun">Öğün</label>
                <select id="ym-ogun" required>${ogunSecenek}</select>
              </div>
            </div>

            <div class="satir-iki">
              <div class="form-grup">
                <label for="ym-ogr-fiyat">Öğrenci Fiyatı (TL)</label>
                <input id="ym-ogr-fiyat" type="number" step="0.01" min="0" value="40" required>
              </div>
              <div class="form-grup">
                <label for="ym-per-fiyat">Personel Fiyatı (TL)</label>
                <input id="ym-per-fiyat" type="number" step="0.01" min="0" value="90" required>
              </div>
            </div>

            <div class="form-grup">
              <label>Yemekler</label>
              <div id="ym-yemek-kutusu" class="yemek-secim-kutusu">${yemekKutulari}</div>
            </div>

            <div class="hizli-tutarlar">
              <button type="submit" id="ym-kaydet-btn" class="dugme">Menüyü Kaydet</button>
              <button type="button" id="ym-vazgec-btn" class="dugme dugme-ikincil gizli">Düzenlemeyi İptal Et</button>
            </div>
          </form>
        </section>

        <section class="kart">
          <h2>Menü Doluluk ve Puan Raporu</h2>
          <div class="filtre-satiri">
            <div class="form-grup">
              <label for="rapor-tarih">Tarih Filtresi (boş: son menüler)</label>
              <input id="rapor-tarih" type="date" value="">
            </div>
            <div class="form-grup">
              <button type="button" id="rapor-filtrele" class="dugme dugme-tam">Raporu Getir</button>
            </div>
            <div class="form-grup">
              <button type="button" id="rapor-temizle" class="dugme dugme-ikincil dugme-tam">Tümünü Göster</button>
            </div>
          </div>
          <div id="rapor-doluluk" class="tablo-kaydir"></div>
        </section>

        <section class="kart">
          <h2>Turnike Geçişi</h2>
          <form id="turnike-form">
            <div class="filtre-satiri">
              <div class="form-grup">
                <label for="tk-kullanici">Kullanıcı</label>
                <select id="tk-kullanici" required>${kullaniciSecenek}</select>
              </div>
              <div class="form-grup">
                <label for="tk-yemekhane">Yemekhane</label>
                <select id="tk-yemekhane" required>${yemekhaneSecenek}</select>
              </div>
              <div class="form-grup">
                <label for="tk-zaman">Zaman (boş: şimdi)</label>
                <input id="tk-zaman" type="datetime-local">
              </div>
            </div>
            <button type="submit" class="dugme">Turnike Geçişini Onayla</button>
          </form>
        </section>

        <section class="kart">
          <h2>Son Değerlendirmeler</h2>
          <div id="rapor-yorumlar" class="tablo-kaydir"></div>
        </section>`;

      const menuForm = document.getElementById('yonetici-menu-form');
      const baslikEl = document.getElementById('menu-form-baslik');
      const duzenlenenIdEl = document.getElementById('duzenlenen-menu-id');
      const yemekhaneEl = document.getElementById('ym-yemekhane');
      const tarihEl = document.getElementById('ym-tarih');
      const ogunEl = document.getElementById('ym-ogun');
      const ogrFiyatEl = document.getElementById('ym-ogr-fiyat');
      const perFiyatEl = document.getElementById('ym-per-fiyat');
      const yemekKutusu = document.getElementById('ym-yemek-kutusu');
      const kaydetBtn = document.getElementById('ym-kaydet-btn');
      const vazgecBtn = document.getElementById('ym-vazgec-btn');

      const raporTarihEl = document.getElementById('rapor-tarih');
      const dolulukEl = document.getElementById('rapor-doluluk');
      const yorumlarEl = document.getElementById('rapor-yorumlar');

      let sonDolulukListesi = [];

      const formuSifirla = () => {
        duzenlenenIdEl.value = '';
        baslikEl.textContent = 'Menü Oluştur';
        kaydetBtn.textContent = 'Menüyü Kaydet';
        vazgecBtn.classList.add('gizli');
        yemekhaneEl.disabled = false;
        tarihEl.disabled = false;
        ogunEl.disabled = false;
        yemekKutusu.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.checked = false;
        });
      };

      const raporuYukle = async () => {
        dolulukEl.innerHTML = '<p class="alt-metin">Yükleniyor…</p>';
        try {
          const sorgu = raporTarihEl.value ? '?tarih=' + encodeURIComponent(raporTarihEl.value) : '';
          const veri = await Api.istek('/yonetici/rapor' + sorgu);
          sonDolulukListesi = veri.doluluk;

          if (!veri.doluluk.length) {
            dolulukEl.innerHTML = '<p class="alt-metin">Kayıtlı menü bulunamadı.</p>';
          } else {
            dolulukEl.innerHTML = `
              <table class="veri-tablosu">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Yemekhane</th>
                    <th>Öğün</th>
                    <th>Doluluk</th>
                    <th>Ortalama Puan</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  ${veri.doluluk
                    .map((d) => {
                      const puanMetin = d.oy_sayisi > 0
                        ? `${Yardimci.esc(d.ortalama_puan)} / 5 (${d.oy_sayisi} oy)`
                        : 'Oy yok';
                      return `
                        <tr>
                          <td>${Yardimci.tarih(d.tarih)}</td>
                          <td>${Yardimci.esc(d.yemekhane)}</td>
                          <td>${Yardimci.esc(d.ogun)}</td>
                          <td>${Yardimci.esc(d.rezerve)} / ${Yardimci.esc(d.kapasite)} (\%${Yardimci.esc(d.doluluk_yuzde)})</td>
                          <td>${puanMetin}</td>
                          <td><button type="button" class="dugme dugme-ikincil" data-duzenle-id="${d.menu_id}">Düzenle</button></td>
                        </tr>`;
                    })
                    .join('')}
                </tbody>
              </table>`;
          }

          if (!veri.yorumlar.length) {
            yorumlarEl.innerHTML = '<p class="alt-metin">Henüz değerlendirme yok.</p>';
          } else {
            yorumlarEl.innerHTML = `
              <table class="veri-tablosu">
                <thead>
                  <tr><th>Tarih</th><th>Menü</th><th>Kullanıcı</th><th>Puan</th><th>Yorum</th></tr>
                </thead>
                <tbody>
                  ${veri.yorumlar
                    .map((y) => `
                      <tr>
                        <td>${Yardimci.tarih(y.tarih)}</td>
                        <td>${Yardimci.esc(y.yemekhane)} ·${Yardimci.esc(y.ogun)}</td>
                        <td>${Yardimci.esc(y.ad)}${Yardimci.esc(y.soyad)}</td>
                        <td><strong>${Yardimci.esc(y.puan)} / 5</strong></td>
                        <td>${Yardimci.esc(y.yorum || '-')}</td>
                      </tr>`)
                    .join('')}
                </tbody>
              </table>`;
          }
        } catch (err) {
          Yardimci.bildirimGoster(err.message, 'hata');
          dolulukEl.innerHTML = '';
        }
      };

      dolulukEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-duzenle-id]');
        if (!btn) return;
        const menuId = Number(btn.getAttribute('data-duzenle-id'));
        const kayit = sonDolulukListesi.find((x) => Number(x.menu_id) === menuId);
        if (!kayit) return;

        duzenlenenIdEl.value = String(kayit.menu_id);
        baslikEl.textContent = `Menüyü Düzenle (#${kayit.menu_id})`;
        kaydetBtn.textContent = 'Değişiklikleri Kaydet';
        vazgecBtn.classList.remove('gizli');

        yemekhaneEl.value = String(kayit.yemekhane_id);
        tarihEl.value = String(kayit.tarih).slice(0, 10);
        ogunEl.value = String(kayit.ogun_id);
        yemekhaneEl.disabled = true;
        tarihEl.disabled = true;
        ogunEl.disabled = true;

        ogrFiyatEl.value = kayit.ogrenci_fiyati;
        perFiyatEl.value = kayit.personel_fiyati;

        const seciliSet = new Set(kayit.yemek_idler.map(Number));
        yemekKutusu.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.checked = seciliSet.has(Number(cb.value));
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      vazgecBtn.addEventListener('click', formuSifirla);

      menuForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const yemekIdler = Array.from(yemekKutusu.querySelectorAll('input[type="checkbox"]:checked'))
          .map((cb) => Number(cb.value));

        const duzenlenenId = duzenlenenIdEl.value ? Number(duzenlenenIdEl.value) : null;
        try {
          let yanit;
          if (duzenlenenId) {
            yanit = await Api.istek(`/yonetici/menuler/${duzenlenenId}`, {
              method: 'PUT',
              body: {
                ogrenci_fiyati: Number(ogrFiyatEl.value),
                personel_fiyati: Number(perFiyatEl.value),
                yemek_idler: yemekIdler
              }
            });
          } else {
            yanit = await Api.istek('/yonetici/menuler', {
              method: 'POST',
              body: {
                yemekhane_id: Number(yemekhaneEl.value),
                tarih: tarihEl.value,
                ogun_id: Number(ogunEl.value),
                ogrenci_fiyati: Number(ogrFiyatEl.value),
                personel_fiyati: Number(perFiyatEl.value),
                yemek_idler: yemekIdler
              }
            });
          }

          Yardimci.bildirimGoster(yanit.mesaj, 'basari');
          formuSifirla();
          await raporuYukle();
        } catch (err) {
          Yardimci.bildirimGoster(err.message, 'hata');
        }
      });

      document.getElementById('rapor-filtrele').addEventListener('click', raporuYukle);
      document.getElementById('rapor-temizle').addEventListener('click', () => {
        raporTarihEl.value = '';
        raporuYukle();
      });

      document.getElementById('turnike-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const zamanDeger = document.getElementById('tk-zaman').value;
        const zaman = zamanDeger ? zamanDeger.replace('T', ' ') + ':00' : undefined;

        try {
          const yanit = await Api.istek('/yonetici/turnike', {
            method: 'POST',
            body: {
              kullanici_id: Number(document.getElementById('tk-kullanici').value),
              yemekhane_id: Number(document.getElementById('tk-yemekhane').value),
              zaman
            }
          });
          Yardimci.bildirimGoster(yanit.mesaj, 'basari');
        } catch (err) {
          Yardimci.bildirimGoster(err.message, 'hata');
        }
      });

      await raporuYukle();
    } catch (err) {
      Yardimci.bildirimGoster(err.message, 'hata');
      kapsayici.innerHTML = '<h1>Yönetici Paneli</h1>';
    }
  }
};