window.HesapEkranlari = {
  durumRozet(durum) {
    if (durum === 'aktif') return '<span class="etiket etiket-aktif">Aktif</span>';
    if (durum === 'kullanildi') return '<span class="etiket etiket-kullanildi">Kullanıldı</span>';
    return '<span class="etiket etiket-iptal">İptal</span>';
  },

  porsiyonRozet(porsiyon) {
    if (porsiyon === 'yarim') {
      return '<span class="etiket etiket-porsiyon">Yarım Porsiyon (%60)</span>';
    }
    return '<span class="etiket etiket-porsiyon">Tam Porsiyon</span>';
  },

  hareketTurEtiket(tur) {
    if (tur === 'yukleme') return 'Bakiye Yükleme';
    if (tur === 'iade') return 'İade';
    return 'Rezervasyon';
  },

  async rezervasyonlarim(kapsayici, durum) {
    kapsayici.innerHTML = '<h1>Rezervasyonlarım</h1><div id="rez-liste"><p class="alt-metin">Yükleniyor…</p></div>';
    const listeEl = document.getElementById('rez-liste');

    const yukle = async () => {
      try {
        const veri = await Api.istek('/rezervasyonlar');
        if (!veri.rezervasyonlar.length) {
          listeEl.innerHTML = '<div class="kart"><p>Henüz rezervasyonunuz bulunmuyor.</p></div>';
          return;
        }

        listeEl.innerHTML = `<div class="kart-izgara">${veri.rezervasyonlar
          .map((r) => {
            let dugmeHtml = '';
            if (r.iptal_edilebilir) {
              dugmeHtml = `<button type="button" class="dugme dugme-tehlike" data-iptal-id="${r.id}">İptal Et</button>`;
            } else if (r.durum === 'aktif') {
              dugmeHtml = '<button type="button" class="dugme" disabled>İptal Süresi Doldu</button>';
            } else if (r.degerlendirilebilir) {
              const metin = r.verdigim_puan ? `Puanı Güncelle (${r.verdigim_puan}/5)` : 'Değerlendir';
              dugmeHtml = `<button type="button" class="dugme dugme-ikincil" data-deg-git="1">${metin}</button>`;
            }

            const ekBilgi = r.kullanma_zamani
              ? `Kullanım: ${Yardimci.tarih(r.kullanma_zamani)}`
              : r.iptal_zamani
                ? `İptal: ${Yardimci.tarih(r.iptal_zamani)}`
                : `Son iptal: ${Yardimci.tarih(r.rezervasyon_son)}`;

            return `
              <article class="kart">
                <div class="kart-ust">
                  <div>
                    <h2>${Yardimci.esc(r.ogun)} · ${Yardimci.esc(r.yemekhane)}</h2>
                    <div class="alt-metin">${Yardimci.tarih(r.tarih)}</div>
                  </div>
                  <div class="etiket-grubu">
                    ${this.porsiyonRozet(r.porsiyon)}
                    ${this.durumRozet(r.durum)}
                  </div>
                </div>
                <p class="alt-metin">${ekBilgi}</p>
                <div class="kart-alt">
                  <span class="etiket etiket-fiyat">${Yardimci.para(r.ucret)}</span>
                  ${dugmeHtml}
                </div>
              </article>`;
          })
          .join('')}</div>`;
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
        listeEl.innerHTML = '';
      }
    };

    listeEl.addEventListener('click', async (e) => {
      const degBtn = e.target.closest('[data-deg-git]');
      if (degBtn) {
        durum.ekranaGit('degerlendirme');
        return;
      }

      const iptalBtn = e.target.closest('[data-iptal-id]');
      if (!iptalBtn) return;

      const id = Number(iptalBtn.getAttribute('data-iptal-id'));
      iptalBtn.disabled = true;
      try {
        const yanit = await Api.istek(`/rezervasyonlar/${id}/iptal`, { method: 'POST' });
        durum.bakiyeGuncelle(yanit.bakiye);
        Yardimci.bildirimGoster(yanit.mesaj, 'basari');
        await yukle();
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
        iptalBtn.disabled = false;
      }
    });

    await yukle();
  },

  async bakiye(kapsayici, durum) {
    kapsayici.innerHTML = `
      <h1>Bakiye ve Hareketler</h1>
      <div class="kart-izgara">
        <section class="kart">
          <h2>Güncel Bakiye</h2>
          <p id="bakiye-deger" style="font-size: 1.8rem; font-weight: 700; color: var(--ana); margin: 0.5rem 0;">—</p>
          <p class="alt-metin">Tek seferde 10 TL ile 1000 TL arasında yükleme yapılabilir.</p>
        </section>
        <section class="kart">
          <h2>Bakiye Yükle</h2>
          <div class="hizli-tutarlar">
            <button type="button" class="dugme dugme-ikincil" data-tutar="50">50 TL</button>
            <button type="button" class="dugme dugme-ikincil" data-tutar="100">100 TL</button>
            <button type="button" class="dugme dugme-ikincil" data-tutar="200">200 TL</button>
            <button type="button" class="dugme dugme-ikincil" data-tutar="500">500 TL</button>
          </div>
          <form id="bakiye-form">
            <div class="form-grup">
              <label for="yukleme-tutar">Tutar (TL)</label>
              <input id="yukleme-tutar" type="number" step="0.01" required placeholder="Örn. 100">
            </div>
            <button type="submit" class="dugme dugme-tam">Bakiye Yükle</button>
          </form>
        </section>
      </div>
      <section class="kart">
        <h2>Hareket Geçmişi</h2>
        <div id="hareket-tablo" class="tablo-kaydir"><p class="alt-metin">Yükleniyor…</p></div>
      </section>`;

    const degerEl = document.getElementById('bakiye-deger');
    const tabloEl = document.getElementById('hareket-tablo');
    const tutarEl = document.getElementById('yukleme-tutar');
    const formEl = document.getElementById('bakiye-form');

    kapsayici.querySelectorAll('[data-tutar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tutarEl.value = btn.getAttribute('data-tutar');
      });
    });

    const yukle = async () => {
      try {
        const veri = await Api.istek('/bakiye');
        degerEl.textContent = Yardimci.para(veri.bakiye);
        durum.bakiyeGuncelle(veri.bakiye);

        if (!veri.hareketler.length) {
          tabloEl.innerHTML = '<p class="alt-metin">Henüz bakiye hareketi yok.</p>';
          return;
        }

        tabloEl.innerHTML = `
          <table class="veri-tablosu">
            <thead>
              <tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th>Tutar</th></tr>
            </thead>
            <tbody>
              ${veri.hareketler
                .map((h) => {
                  const tutarSayi = Number(h.tutar);
                  const sinif = tutarSayi >= 0 ? 'tutar-arti' : 'tutar-eksi';
                  const isaret = tutarSayi > 0 ? '+' : '';
                  return `
                    <tr>
                      <td>${Yardimci.tarih(h.olusturma)}</td>
                      <td>${this.hareketTurEtiket(h.tur)}</td>
                      <td>${Yardimci.esc(h.aciklama || '-')}</td>
                      <td class="${sinif}">${isaret}${Yardimci.para(tutarSayi)}</td>
                    </tr>`;
                })
                .join('')}
            </tbody>
          </table>`;
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
      }
    };

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const yanit = await Api.istek('/bakiye/yukle', {
          method: 'POST',
          body: { tutar: Number(tutarEl.value) }
        });
        tutarEl.value = '';
        durum.bakiyeGuncelle(yanit.bakiye);
        Yardimci.bildirimGoster(yanit.mesaj, 'basari');
        await yukle();
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
      }
    });

    await yukle();
  },

  async degerlendirme(kapsayici, durum) {
    kapsayici.innerHTML = '<h1>Menü Değerlendirme</h1><div id="deg-liste"><p class="alt-metin">Yükleniyor…</p></div>';
    const listeEl = document.getElementById('deg-liste');

    const yukle = async () => {
      try {
        const veri = await Api.istek('/rezervasyonlar');
        const kullanilanlar = veri.rezervasyonlar.filter((r) => r.degerlendirilebilir);

        if (!kullanilanlar.length) {
          listeEl.innerHTML = '<div class="kart"><p>Değerlendirilebilecek kullanılmış öğün bulunmuyor.</p></div>';
          return;
        }

        listeEl.innerHTML = `<div class="kart-izgara">${kullanilanlar
          .map((r) => {
            const secenekler = [5, 4, 3, 2, 1]
              .map((p) => `<option value="${p}" ${Number(r.verdigim_puan) === p ? 'selected' : ''}>${p} Puan</option>`)
              .join('');

            return `
              <article class="kart">
                <div class="kart-ust">
                  <div>
                    <h2>${Yardimci.esc(r.ogun)} · ${Yardimci.esc(r.yemekhane)}</h2>
                    <div class="alt-metin">${Yardimci.tarih(r.tarih)}</div>
                  </div>
                  ${r.verdigim_puan ? `<span class="etiket etiket-kullanildi">Puanınız: ${r.verdigim_puan}/5</span>` : ''}
                </div>
                <form class="deg-form" data-menu-id="${r.menu_id}">
                  <div class="form-grup">
                    <label for="puan-${r.menu_id}">Puan (1-5)</label>
                    <select id="puan-${r.menu_id}" name="puan">${secenekler}</select>
                  </div>
                  <div class="form-grup">
                    <label for="yorum-${r.menu_id}">Yorum</label>
                    <textarea id="yorum-${r.menu_id}" name="yorum" rows="3" maxlength="500" placeholder="İsteğe bağlı yorumunuz">${Yardimci.esc(r.verdigim_yorum || '')}</textarea>
                  </div>
                  <button type="submit" class="dugme dugme-tam">${r.verdigim_puan ? 'Değerlendirmeyi Güncelle' : 'Değerlendirmeyi Kaydet'}</button>
                </form>
              </article>`;
          })
          .join('')}</div>`;
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
        listeEl.innerHTML = '';
      }
    };

    listeEl.addEventListener('submit', async (e) => {
      const form = e.target.closest('.deg-form');
      if (!form) return;
      e.preventDefault();

      const menuId = Number(form.getAttribute('data-menu-id'));
      const puan = Number(form.querySelector('[name="puan"]').value);
      const yorum = form.querySelector('[name="yorum"]').value.trim();

      try {
        const yanit = await Api.istek('/rezervasyonlar/degerlendir', {
          method: 'POST',
          body: { menu_id: menuId, puan, yorum }
        });
        Yardimci.bildirimGoster(yanit.mesaj, 'basari');
        await yukle();
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
      }
    });

    await yukle();
  },

  async profil(kapsayici, durum) {
    const k = durum.kullanici;
    kapsayici.innerHTML = `
      <h1>Profil ve Alerjen Tercihlerim</h1>
      <section class="kart">
        <h2>Hesap Bilgileri</h2>
        <p><strong>${Yardimci.esc(k.ad)} ${Yardimci.esc(k.soyad)}</strong> · ${Yardimci.esc(k.eposta)}</p>
        ${k.ogrenci_no ? `<p class="alt-metin">Öğrenci No: ${Yardimci.esc(k.ogrenci_no)}</p>` : ''}
      </section>
      <section class="kart">
        <h2>Alerjenlerim</h2>
        <p class="alt-metin" style="margin-bottom: 0.75rem;">
          Alerjiniz olan maddeleri seçip kaydedin. Günün menüsü ve haftalık menü ekranlarında bu alerjenleri içeren yemekler kırmızı uyarıyla vurgulanır.
        </p>
        <div id="alerjen-alan"><p class="alt-metin">Alerjen listesi yükleniyor…</p></div>
      </section>`;

    const alanEl = document.getElementById('alerjen-alan');

    try {
      const veri = await Api.istek('/profil/alerjenler');
      const seciliSet = new Set((veri.secili_alerjen_idler || []).map(Number));

      alanEl.innerHTML = `
        <form id="alerjen-form">
          <div class="alerjen-izgara">
            ${veri.alerjenler
              .map((a) => `
                <label class="alerjen-kart">
                  <input type="checkbox" name="alerjen_id" value="${a.id}" ${seciliSet.has(Number(a.id)) ? 'checked' : ''}>
                  <span>${Yardimci.esc(a.ad)}</span>
                </label>`)
              .join('')}
          </div>
          <button type="submit" class="dugme">Alerjen Tercihlerimi Kaydet</button>
        </form>`;

      document.getElementById('alerjen-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const secililer = Array.from(alanEl.querySelectorAll('input[name="alerjen_id"]:checked'))
          .map((cb) => Number(cb.value));

        try {
          const yanit = await Api.istek('/profil/alerjenler', {
            method: 'PUT',
            body: { alerjen_idler: secililer }
          });
          Yardimci.bildirimGoster(yanit.mesaj, 'basari');
        } catch (err) {
          Yardimci.bildirimGoster(err.message, 'hata');
        }
      });
    } catch (err) {
      Yardimci.bildirimGoster(err.message, 'hata');
      alanEl.innerHTML = '';
    }
  }
};