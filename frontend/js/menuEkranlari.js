window.MenuEkranlari = {
  yemekListesiHtml(yemekler) {
    return yemekler
      .map((y) => {
        const etiketler = [];
        etiketler.push(`<span class="etiket">${Yardimci.esc(y.kategori)}</span>`);
        if (y.vejetaryen) {
          etiketler.push('<span class="etiket etiket-veg">Vejetaryen</span>');
        }
        if (y.alerjenler) {
          etiketler.push(`<span class="etiket etiket-alerjen">Alerjen: ${Yardimci.esc(y.alerjenler)}</span>`);
        }
        if (y.alerjen_uyari && Array.isArray(y.eslesen_alerjenler) && y.eslesen_alerjenler.length) {
          etiketler.push(
            `<span class="etiket etiket-uyari">⚠ Alerjen Uyarısı: ${Yardimci.esc(y.eslesen_alerjenler.join(', '))}</span>`
          );
        }

        const satirSinifi = y.alerjen_uyari ? 'yemek-satir yemek-satir-uyari' : 'yemek-satir';
        return `
          <li class="${satirSinifi}">
            <div class="yemek-baslik">
              <span>${Yardimci.esc(y.ad)}</span>
              <span class="alt-metin">${Yardimci.esc(y.kalori)} kcal</span>
            </div>
            <div class="etiket-grubu">${etiketler.join('')}</div>
          </li>`;
      })
      .join('');
  },

  menuUyariHtml(menu) {
    if (!menu.alerjen_uyari_var) return '';
    return '<div class="menu-alerjen-uyari">⚠ Dikkat: Bu menüde profilinizde seçili alerjenleri içeren yemekler bulunuyor.</div>';
  },

  fiyatMetni(menu, kullanici) {
    if (kullanici && menu.kullanici_fiyati !== null && menu.kullanici_fiyati !== undefined) {
      if (menu.yarim_porsiyon_izin && menu.kullanici_yarim_fiyati !== null && menu.kullanici_yarim_fiyati !== undefined) {
        return `Tam: ${Yardimci.para(menu.kullanici_fiyati)} · Yarım: ${Yardimci.para(menu.kullanici_yarim_fiyati)}`;
      }
      return Yardimci.para(menu.kullanici_fiyati);
    }
    return `Öğr: ${Yardimci.para(menu.ogrenci_fiyati)} / Pers: ${Yardimci.para(menu.personel_fiyati)}`;
  },

  async gununMenusu(kapsayici, durum) {
    const yemekhaneSecenek = durum.meta.yemekhaneler
      .map((y) => `<option value="${y.id}">${Yardimci.esc(y.ad)}</option>`)
      .join('');
    const ogunSecenek = durum.meta.ogunler
      .map((o) => `<option value="${o.id}">${Yardimci.esc(o.ad)}</option>`)
      .join('');

    kapsayici.innerHTML = `
      <h1>Günün Menüsü</h1>
      <section class="kart">
        <div class="filtre-satiri">
          <div class="form-grup">
            <label for="gun-yemekhane">Yemekhane</label>
            <select id="gun-yemekhane">
              <option value="">Tümü</option>
              ${yemekhaneSecenek}
            </select>
          </div>
          <div class="form-grup">
            <label for="gun-ogun">Öğün</label>
            <select id="gun-ogun">
              <option value="">Tümü</option>
              ${ogunSecenek}
            </select>
          </div>
          <div class="form-grup">
            <label for="gun-tarih">Tarih</label>
            <input id="gun-tarih" type="date" value="${Yardimci.bugunIso()}">
          </div>
        </div>
      </section>
      <div id="gunun-liste"></div>`;

    const yemekhaneEl = document.getElementById('gun-yemekhane');
    const ogunEl = document.getElementById('gun-ogun');
    const tarihEl = document.getElementById('gun-tarih');
    const listeEl = document.getElementById('gunun-liste');

    const yukle = async () => {
      listeEl.innerHTML = '<p class="alt-metin">Menüler yükleniyor…</p>';
      try {
        const params = new URLSearchParams();
        if (tarihEl.value) params.set('tarih', tarihEl.value);
        if (yemekhaneEl.value) params.set('yemekhane_id', yemekhaneEl.value);
        if (ogunEl.value) params.set('ogun_id', ogunEl.value);

        const veri = await Api.istek('/menuler/gunun?' + params.toString());
        if (!veri.menuler.length) {
          listeEl.innerHTML = '<div class="kart"><p>Seçilen kriterlere uygun menü bulunamadı.</p></div>';
          return;
        }

        listeEl.innerHTML = `<div class="kart-izgara">${veri.menuler
          .map((m) => {
            const puanHtml = m.oy_sayisi > 0
              ? `<span class="etiket">${Yardimci.esc(m.ortalama_puan)} / 5 (${m.oy_sayisi} oy)</span>`
              : '<span class="etiket">Henüz puan yok</span>';

            return `
              <article class="kart">
                <div class="kart-ust">
                  <div>
                    <h2>${Yardimci.esc(m.ogun)} ·${Yardimci.esc(m.yemekhane)}</h2>
                    <div class="alt-metin">${Yardimci.tarih(m.tarih)} · Son rezervasyon: ${Yardimci.tarih(m.rezervasyon_son)}</div>
                  </div>
                  ${puanHtml}
                </div>
                ${this.menuUyariHtml(m)}
                <ul class="yemek-listesi">${this.yemekListesiHtml(m.yemekler)}</ul>
                <div class="kart-alt">
                  <strong>Toplam: ${Yardimci.esc(m.toplam_kalori)} kcal</strong>
                  <span class="etiket etiket-fiyat">${this.fiyatMetni(m, durum.kullanici)}</span>
                  <span class="alt-metin">Boş yer: ${Yardimci.esc(m.bos_yer)} /${Yardimci.esc(m.kapasite)}</span>
                </div>
              </article>`;
          })
          .join('')}</div>`;
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
        listeEl.innerHTML = '';
      }
    };

    yemekhaneEl.addEventListener('change', yukle);
    ogunEl.addEventListener('change', yukle);
    tarihEl.addEventListener('change', yukle);
    await yukle();
  },

  async haftalikMenu(kapsayici, durum) {
    const yemekhaneSecenek = durum.meta.yemekhaneler
      .map((y) => `<option value="${y.id}">${Yardimci.esc(y.ad)}</option>`)
      .join('');

    kapsayici.innerHTML = `
      <h1>Haftalık Menü ve Rezervasyon</h1>
      <section class="kart">
        <div class="filtre-satiri">
          <div class="form-grup">
            <label for="hafta-yemekhane">Yemekhane</label>
            <select id="hafta-yemekhane">
              <option value="">Tümü</option>
              ${yemekhaneSecenek}
            </select>
          </div>
          <div class="form-grup">
            <label for="hafta-baslangic">Başlangıç Tarihi</label>
            <input id="hafta-baslangic" type="date" value="${Yardimci.bugunIso()}">
          </div>
          <div class="form-grup">
            <button id="hafta-bugun" type="button" class="dugme dugme-ikincil dugme-tam">Bugünden Başla</button>
          </div>
        </div>
      </section>
      <div id="haftalik-liste"></div>`;

    const yemekhaneEl = document.getElementById('hafta-yemekhane');
    const baslangicEl = document.getElementById('hafta-baslangic');
    const bugunBtn = document.getElementById('hafta-bugun');
    const listeEl = document.getElementById('haftalik-liste');

    const islemDugmesiHtml = (m) => {
      if (m.kullanici_rezervasyon_durum === 'aktif') {
        const porsiyonMetin = m.kullanici_rezervasyon_porsiyon === 'yarim' ? 'Yarım' : 'Tam';
        return `<button type="button" class="dugme" disabled>Rezerve Edildi (${porsiyonMetin})</button>`;
      }
      if (m.kullanici_rezervasyon_durum === 'kullanildi') {
        const porsiyonMetin = m.kullanici_rezervasyon_porsiyon === 'yarim' ? 'Yarım' : 'Tam';
        return `<button type="button" class="dugme" disabled>Kullanıldı (${porsiyonMetin})</button>`;
      }
      if (m.suresi_doldu) {
        return '<button type="button" class="dugme" disabled>Süresi Doldu</button>';
      }
      if (!durum.kullanici) {
        return '<button type="button" class="dugme dugme-ikincil" data-giris-git="1">Rezervasyon için giriş yap</button>';
      }

      if (m.yarim_porsiyon_izin) {
        const tamFiyat = Yardimci.para(m.kullanici_fiyati);
        const yarimFiyat = Yardimci.para(m.kullanici_yarim_fiyati);
        return `
          <div class="rez-islem-grup">
            <select class="porsiyon-secim" data-porsiyon-menu="${m.menu_id}" aria-label="Porsiyon seçimi">
              <option value="tam">Tam Porsiyon (${tamFiyat})</option>
              <option value="yarim">Yarım Porsiyon (%60 — ${yarimFiyat})</option>
            </select>
            <button type="button" class="dugme" data-rez-menu="${m.menu_id}">Rezervasyon Yap</button>
          </div>`;
      }

      return `
        <div class="rez-islem-grup">
          <span class="etiket etiket-porsiyon">Yalnızca tam porsiyon</span>
          <button type="button" class="dugme" data-rez-menu="${m.menu_id}">Rezervasyon Yap</button>
        </div>`;
    };

    const yukle = async () => {
      listeEl.innerHTML = '<p class="alt-metin">Haftalık menü yükleniyor…</p>';
      try {
        const params = new URLSearchParams();
        if (baslangicEl.value) params.set('baslangic', baslangicEl.value);
        if (yemekhaneEl.value) params.set('yemekhane_id', yemekhaneEl.value);

        const veri = await Api.istek('/menuler/haftalik?' + params.toString());
        if (!veri.menuler.length) {
          listeEl.innerHTML = '<div class="kart"><p>Bu tarih aralığında menü bulunamadı.</p></div>';
          return;
        }

        const gruplar = new Map();
        for (const m of veri.menuler) {
          const gun = String(m.tarih).slice(0, 10);
          if (!gruplar.has(gun)) gruplar.set(gun, []);
          gruplar.get(gun).push(m);
        }

        let html = '';
        for (const [gun, gunMenuleri] of gruplar.entries()) {
          html += `<h2 class="gun-baslik">${Yardimci.tarih(gun)}</h2><div class="kart-izgara">`;
          html += gunMenuleri
            .map((m) => `
              <article class="kart">
                <div class="kart-ust">
                  <div>
                    <h3>${Yardimci.esc(m.ogun)} · ${Yardimci.esc(m.yemekhane)}</h3>
                    <div class="alt-metin">Son saat: ${Yardimci.tarih(m.rezervasyon_son)} · ${Yardimci.esc(m.toplam_kalori)} kcal</div>
                  </div>
                  <span class="etiket etiket-fiyat">${this.fiyatMetni(m, durum.kullanici)}</span>
                </div>
                ${this.menuUyariHtml(m)}
                <ul class="yemek-listesi">${this.yemekListesiHtml(m.yemekler)}</ul>
                <div class="kart-alt">
                  <span class="alt-metin">Boş yer: <strong>${Yardimci.esc(m.bos_yer)}</strong> / ${Yardimci.esc(m.kapasite)}</span>
                  ${islemDugmesiHtml(m)}
                </div>
              </article>`)
            .join('');
          html += '</div>';
        }

        listeEl.innerHTML = html;
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
        listeEl.innerHTML = '';
      }
    };

    listeEl.addEventListener('click', async (e) => {
      const girisBtn = e.target.closest('[data-giris-git]');
      if (girisBtn) {
        durum.ekranaGit('giris');
        return;
      }

      const rezBtn = e.target.closest('[data-rez-menu]');
      if (!rezBtn) return;

      const menuId = Number(rezBtn.getAttribute('data-rez-menu'));
      const porsiyonEl = listeEl.querySelector(`[data-porsiyon-menu="${menuId}"]`);
      const porsiyon = porsiyonEl ? porsiyonEl.value : 'tam';

      rezBtn.disabled = true;
      try {
        const yanit = await Api.istek('/rezervasyonlar', {
          method: 'POST',
          body: { menu_id: menuId, porsiyon }
        });
        durum.bakiyeGuncelle(yanit.bakiye);
        Yardimci.bildirimGoster(yanit.mesaj, 'basari');
        await yukle();
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
        rezBtn.disabled = false;
      }
    });

    yemekhaneEl.addEventListener('change', yukle);
    baslangicEl.addEventListener('change', yukle);
    bugunBtn.addEventListener('click', () => {
      baslangicEl.value = Yardimci.bugunIso();
      yukle();
    });
    await yukle();
  }
};