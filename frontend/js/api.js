window.Api = {
  async istek(yol, secenekler = {}) {
    const ayar = {
      method: secenekler.method || 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    };

    if (secenekler.body !== undefined) {
      ayar.headers['Content-Type'] = 'application/json';
      ayar.body = JSON.stringify(secenekler.body);
    }

    const yanit = await fetch('/api' + yol, ayar);
    const metin = await yanit.text();
    let veri = {};
    try {
      veri = metin ? JSON.parse(metin) : {};
    } catch {
      veri = { hata: 'Sunucudan geçersiz yanıt alındı.' };
    }

    if (!yanit.ok) {
      const hata = new Error(veri.hata || 'İşlem başarısız oldu.');
      hata.durum = yanit.status;
      throw hata;
    }

    return veri;
  }
};

window.Yardimci = {
  esc(deger) {
    return String(deger ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  para(tutar) {
    const sayi = Number(tutar);
    if (!Number.isFinite(sayi)) return '0,00 TL';
    return sayi.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  },

  tarih(deger) {
    if (!deger) return '-';
    const s = String(deger).slice(0, 10);
    const parca = s.split('-');
    if (parca.length !== 3) return String(deger);
    const saat = String(deger).length > 10 ? ' ' + String(deger).slice(11, 16) : '';
    return `${parca[2]}.${parca[1]}.${parca[0]}${saat}`;
  },

  bugunIso() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  },

  gunEkle(isoTarih, gun) {
    const [y, a, g] = isoTarih.split('-').map(Number);
    const d = new Date(Date.UTC(y, a - 1, g + gun));
    return d.toISOString().slice(0, 10);
  },

  bildirimGoster(mesaj, tur = 'basari') {
    const alan = document.getElementById('bildirim-alani');
    const sinif = tur === 'hata' ? 'bildirim-hata' : 'bildirim-basari';
    alan.innerHTML = `<p class="bildirim ${sinif}" role="${tur === 'hata' ? 'alert' : 'status'}">${this.esc(mesaj)}</p>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  bildirimTemizle() {
    document.getElementById('bildirim-alani').innerHTML = '';
  }
};