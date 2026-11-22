(function () {
  const durum = {
    kullanici: null,
    meta: { yemekhaneler: [], ogunler: [] },
    aktifEkran: 'gunun',

    bakiyeGuncelle(yeniBakiye) {
      if (!this.kullanici) return;
      this.kullanici.bakiye = yeniBakiye;
      ustPaneliCiz();
    },

    ekranaGit(ekran) {
      if (window.location.hash !== '#' + ekran) {
        window.location.hash = '#' + ekran;
      } else {
        ekraniYukle(ekran);
      }
    }
  };

  function rolEtiketi(rol) {
    if (rol === 'yonetici') return 'Yönetici';
    if (rol === 'personel') return 'Personel';
    return 'Öğrenci';
  }

  function ustPaneliCiz() {
    const panel = document.getElementById('kullanici-paneli');
    if (!durum.kullanici) {
      panel.innerHTML = '<button type="button" class="dugme" id="ust-giris-btn">Giriş Yap</button>';
      document.getElementById('ust-giris-btn').addEventListener('click', () => durum.ekranaGit('giris'));
      return;
    }

    const k = durum.kullanici;
    panel.innerHTML = `
      <span><strong>${Yardimci.esc(k.ad)} ${Yardimci.esc(k.soyad)}</strong> (${rolEtiketi(k.rol)})</span>
      <span class="bakiye-rozet">${Yardimci.para(k.bakiye)}</span>
      <button type="button" class="dugme dugme-ikincil" id="cikis-btn">Çıkış</button>`;

    document.getElementById('cikis-btn').addEventListener('click', async () => {
      try {
        await Api.istek('/cikis', { method: 'POST' });
      } catch {}
      durum.kullanici = null;
      ustPaneliCiz();
      sekmeleriCiz();
      Yardimci.bildirimGoster('Çıkış yapıldı.', 'basari');
      durum.ekranaGit('giris');
    });
  }

  function sekmeleriCiz() {
    const liste = document.getElementById('sekme-listesi');
    const sekmeler = [
      { id: 'gunun', ad: 'Günün Menüsü' },
      { id: 'haftalik', ad: 'Haftalık Menü' }
    ];

    if (durum.kullanici) {
      sekmeler.push(
        { id: 'rezervasyonlar', ad: 'Rezervasyonlarım' },
        { id: 'bakiye', ad: 'Bakiye' },
        { id: 'degerlendirme', ad: 'Değerlendirme' }
      );
      if (durum.kullanici.rol === 'yonetici') {
        sekmeler.push({ id: 'yonetici', ad: 'Yönetici Paneli' });
      }
    } else {
      sekmeler.push({ id: 'giris', ad: 'Giriş' });
    }

    liste.innerHTML = sekmeler
      .map((s) => `<button type="button" class="sekme-dugme ${durum.aktifEkran === s.id ? 'aktif' : ''}" data-ekran="${s.id}">${s.ad}</button>`)
      .join('');

    liste.querySelectorAll('[data-ekran]').forEach((btn) => {
      btn.addEventListener('click', () => {
        durum.ekranaGit(btn.getAttribute('data-ekran'));
      });
    });
  }

  function girisEkraniniCiz(kapsayici) {
    kapsayici.innerHTML = `
      <section class="kart giris-kutu">
        <h1>Giriş Yap</h1>
        <p class="alt-metin">Kampüs e-posta adresiniz ve şifrenizle oturum açın.</p>
        <form id="giris-form">
          <div class="form-grup">
            <label for="giris-eposta">E-posta</label>
            <input id="giris-eposta" type="email" autocomplete="username" required placeholder="ad.soyad@ogr.kampus.edu.tr">
          </div>
          <div class="form-grup">
            <label for="giris-sifre">Şifre</label>
            <input id="giris-sifre" type="password" autocomplete="current-password" required>
          </div>
          <button type="submit" class="dugme dugme-tam">Giriş Yap</button>
        </form>
      </section>`;

    document.getElementById('giris-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const eposta = document.getElementById('giris-eposta').value.trim();
      const sifre = document.getElementById('giris-sifre').value;

      try {
        const yanit = await Api.istek('/giris', {
          method: 'POST',
          body: { eposta, sifre }
        });
        durum.kullanici = yanit.kullanici;
        ustPaneliCiz();
        sekmeleriCiz();
        Yardimci.bildirimGoster(yanit.mesaj, 'basari');
        durum.ekranaGit('gunun');
      } catch (err) {
        Yardimci.bildirimGoster(err.message, 'hata');
      }
    });
  }

  async function ekraniYukle(ekran) {
    const gecerli = ['giris', 'gunun', 'haftalik', 'rezervasyonlar', 'bakiye', 'degerlendirme', 'yonetici'];
    let hedef = gecerli.includes(ekran) ? ekran : 'gunun';

    const oturumGerekli = ['rezervasyonlar', 'bakiye', 'degerlendirme', 'yonetici'];
    if (oturumGerekli.includes(hedef) && !durum.kullanici) {
      hedef = 'giris';
    }
    if (hedef === 'yonetici' && durum.kullanici?.rol !== 'yonetici') {
      Yardimci.bildirimGoster('Bu ekran yalnızca yöneticiler içindir.', 'hata');
      hedef = 'gunun';
    }

    durum.aktifEkran = hedef;
    sekmeleriCiz();

    const icerik = document.getElementById('icerik');
    if (hedef === 'giris') {
      girisEkraniniCiz(icerik);
    } else if (hedef === 'gunun') {
      await MenuEkranlari.gununMenusu(icerik, durum);
    } else if (hedef === 'haftalik') {
      await MenuEkranlari.haftalikMenu(icerik, durum);
    } else if (hedef === 'rezervasyonlar') {
      await HesapEkranlari.rezervasyonlarim(icerik, durum);
    } else if (hedef === 'bakiye') {
      await HesapEkranlari.bakiye(icerik, durum);
    } else if (hedef === 'degerlendirme') {
      await HesapEkranlari.degerlendirme(icerik, durum);
    } else if (hedef === 'yonetici') {
      await YoneticiEkrani.goster(icerik, durum);
    }
  }

  async function baslat() {
    try {
      durum.meta = await Api.istek('/menuler/meta');
    } catch (err) {
      Yardimci.bildirimGoster(err.message, 'hata');
    }

    try {
      const veri = await Api.istek('/ben');
      durum.kullanici = veri.kullanici;
    } catch {
      durum.kullanici = null;
    }

    ustPaneliCiz();

    window.addEventListener('hashchange', () => {
      Yardimci.bildirimTemizle();
      const ekran = window.location.hash.replace('#', '') || 'gunun';
      ekraniYukle(ekran);
    });

    const ilkEkran = window.location.hash.replace('#', '') || 'gunun';
    await ekraniYukle(ilkEkran);
  }

  baslat();
})();