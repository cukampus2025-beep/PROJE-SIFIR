require('dotenv').config();
const express = require('express');
const cors = require('cors');
// 🔥 DEĞİŞİKLİK: Client yerine Pool kullanıyoruz (Bağlantı kopmaz)
const { Pool } = require('pg');
const https = require('https');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const GIZLI_ANAHTAR = "cukurova_cok_gizli_anahtar_123";

// --- GÜVENLİ VERİ ÇEKME VE TEMİZLEME ---
const API_KEY = process.env.MAIL_SIFRE ? process.env.MAIL_SIFRE.trim() : "";
const SENDER_EMAIL = process.env.MAIL_KULLANICI ? process.env.MAIL_KULLANICI.trim() : "";

// 🔥 DEĞİŞİKLİK: BAĞLANTI HAVUZU (POOL) AYARLARI
// Bu ayar sayesinde bağlantı kopsa bile otomatik yenisi açılır.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20, // Aynı anda 20 bağlantıya izin ver
    idleTimeoutMillis: 30000, // 30 saniye boşta kalırsa kapat
    connectionTimeoutMillis: 2000, // 2 saniyede bağlanamazsa hata ver (bekletme)
});

// Veritabanı testi (Log için)
pool.connect()
    .then(client => {
        console.log("✅ Veritabanı Havuzu Bağlandı!");
        client.release(); // Bağlantıyı havuza geri bırak
    })
    .catch(err => console.error("❌ DB Havuz Hatası:", err));

// --- API İLE MAİL GÖNDERME (Senin çalışan kodun) ---
function sendEmail(to, code) {
    if (!API_KEY || !SENDER_EMAIL) {
        console.error("❌ HATA: API Anahtarı veya Gönderici Maili eksik!");
        return;
    }

    const postData = JSON.stringify({
        sender: { name: "Cukurova Kampus", email: SENDER_EMAIL },
        to: [{ email: to }],
        subject: "Dogrulama Kodun",
        htmlContent: `
            <div style="font-family:sans-serif; padding:20px; background:#f4f4f4;">
                <div style="background:#fff; max-width:500px; margin:0 auto; padding:20px; border-radius:10px; text-align:center;">
                    <h2 style="color:#004aad;">Hos Geldin!</h2>
                    <p>Kayit olmak icin dogrulama kodun:</p>
                    <h1 style="background:#eee; padding:10px; letter-spacing:5px; border-radius:5px;">${code}</h1>
                    <p style="color:#999; font-size:12px;">Bu kod 5 dakika gecerlidir.</p>
                </div>
            </div>`
    });

    const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': API_KEY,
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`✅ Mail Başarıyla İletildi: ${to}`);
            } else {
                console.error(`❌ Mail API Hatası (${res.statusCode}):`, body);
            }
        });
    });

    req.on('error', (e) => console.error("❌ İstek Hatası:", e));
    req.write(postData);
    req.end();
}

// --- API ENDPOINT (pool.query ile güncellendi) ---
app.post('/kod-gonder', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`İşlem: ${email}`);

        // client.query yerine pool.query kullanıyoruz
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) return res.status(400).json({ error: "Bu mail kayıtlı." });
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]); 
        await pool.query("INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')", [email, code]);

        res.json({ success: true, message: "Kod gönderildi." });

        sendEmail(email, code);

    } catch (err) { 
        console.error("Sunucu Hatası:", err);
        if (!res.headersSent) res.status(500).json({ error: "Hata oluştu." });
    }
});

// --- DİĞER FONKSİYONLAR (HEPSİ pool.query OLARAK GÜNCELLENDİ) ---
app.get('/ders-yorumlari/:kod', async (req, res) => { try { const anaYorumlarRes = await pool.query('SELECT * FROM ders_yorumlari WHERE ders_kodu = $1 AND (ust_id = 0 OR ust_id IS NULL) ORDER BY tarih DESC', [req.params.kod]); const cevaplarRes = await pool.query('SELECT * FROM ders_yorumlari WHERE ders_kodu = $1 AND ust_id != 0 ORDER BY tarih ASC', [req.params.kod]); const birlesmisVeri = anaYorumlarRes.rows.map(ana => ({ ...ana, cevaplar: cevaplarRes.rows.filter(c => c.ust_id === ana.id) })); res.json(birlesmisVeri); } catch(e) { res.json([]); } });
app.post('/ders-yorum-ekle', async (req, res) => { try { const ustId = parseInt(req.body.ust_id) || 0; await pool.query('INSERT INTO ders_yorumlari (ders_kodu, ders_adi, kullanici_adi, yorum_metni, ust_id) VALUES ($1, $2, $3, $4, $5)', [req.body.ders_kodu, req.body.ders_adi, req.body.kullanici_adi, req.body.yorum_metni, ustId]); res.json({ success: true }); } catch(e) { res.status(500).json({ error: "Hata" }); } });
app.post('/kayit-tamamla', async (req, res) => { try { const { email, password, nickname, code } = req.body; const kodCheck = await pool.query("SELECT * FROM verification_codes WHERE email = $1 AND code = $2", [email, code]); if (kodCheck.rows.length === 0) return res.status(400).json({ error: "Kod hatalı." }); const nickCheck = await pool.query("SELECT * FROM users WHERE nickname = $1", [nickname]); if (nickCheck.rows.length > 0) return res.status(400).json({ error: "Bu isim alınmış." }); const hash = await bcrypt.hash(password, 10); await pool.query("INSERT INTO users (email, password, nickname, role) VALUES ($1, $2, $3, 'ogrenci')", [email, hash, nickname]); await pool.query("DELETE FROM verification_codes WHERE email = $1", [email]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Hata" }); } });

// 🔥 GİRİŞ KISMI (Havuz sistemiyle)
app.post('/giris', async (req, res) => { 
    try { 
        const { email, password } = req.body; 
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]); 
        if (result.rows.length === 0) return res.status(400).json({ error: "Kullanıcı yok." }); 
        const user = result.rows[0]; 
        if (user.is_banned) return res.status(403).json({ error: "Banlandınız." }); 
        
        if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: "Şifre yanlış." }); 
        
        const token = jwt.sign({ id: user.id, nickname: user.nickname, role: user.role }, GIZLI_ANAHTAR); 
        res.json({ success: true, token, user: { nickname: user.nickname, role: user.role } }); 
    } catch (err) { 
        console.error("Giriş Hatası Detayı:", err);
        res.status(500).json({ error: "Giriş hatası." }); 
    } 
});

app.get('/bolumler', async (req, res) => { const r = await pool.query('SELECT DISTINCT fakulte, bolum FROM dersler ORDER BY fakulte, bolum'); res.json(r.rows); });
app.get('/hocalar', async (req, res) => { const r = await pool.query("SELECT DISTINCT hoca_adi FROM dersler WHERE hoca_adi != 'Belirtilmemiş' ORDER BY hoca_adi"); res.json(r.rows); });
app.get('/dersler/:bolum', async (req, res) => { const r = await pool.query('SELECT * FROM dersler WHERE bolum = $1', [req.params.bolum]); res.json(r.rows); });
app.get('/hoca-dersleri/:hoca', async (req, res) => { const r = await pool.query('SELECT * FROM dersler WHERE hoca_adi = $1', [req.params.hoca]); res.json(r.rows); });
app.get('/toplam-yorum-sayisi', async (req, res) => { try { const r = await pool.query(`SELECT (SELECT COUNT(*) FROM ders_yorumlari) + (SELECT COUNT(*) FROM yurt_yorumlari) + (SELECT COUNT(*) FROM forum) as toplam`); res.json({ toplam: parseInt(r.rows[0].toplam || 0) }); } catch { res.json({ toplam: 0 }); }});
app.get('/yurt-yorumlari/:yurt', async (req, res) => { const r = await pool.query('SELECT * FROM yurt_yorumlari WHERE yurt_adi = $1 ORDER BY tarih DESC', [req.params.yurt]); res.json(r.rows); });
app.post('/yurt-yorum-ekle', async (req, res) => { await pool.query('INSERT INTO yurt_yorumlari (yurt_adi, yorum_metni, kullanici_adi) VALUES ($1, $2, $3)', [req.body.yurt_adi, req.body.yorum_metni, req.body.kullanici_adi]); res.json({ success: true }); });
app.post('/iletisim-gonder', async (req, res) => { await pool.query('INSERT INTO iletisim_mesajlari (mesaj) VALUES ($1)', [req.body.mesaj]); res.json({ success: true }); });
app.get('/forum/:tur', async (req, res) => { const ana = await pool.query('SELECT * FROM forum WHERE tur = $1 AND ust_id = 0 ORDER BY tarih DESC', [req.params.tur]); const cev = await pool.query('SELECT * FROM forum WHERE tur = $1 AND ust_id != 0 ORDER BY tarih ASC', [req.params.tur]); const sonuc = ana.rows.map(s => ({ ...s, cevaplar: cev.rows.filter(c => c.ust_id === s.id) })); res.json(sonuc); });
app.post('/forum-ekle', async (req, res) => { await pool.query('INSERT INTO forum (tur, ust_id, kullanici_adi, mesaj) VALUES ($1, $2, $3, $4)', [req.body.tur, req.body.ust_id||0, req.body.kullanici_adi, req.body.mesaj]); res.json({ success: true }); });
app.post('/yorum-sil', async (req, res) => { try { const { tur, id, kullanici_adi } = req.body; let tablo = tur === 'ders' ? "ders_yorumlari" : tur === 'yurt' ? "yurt_yorumlari" : "forum"; const kontrol = await pool.query(`SELECT * FROM ${tablo} WHERE id = $1`, [id]); if(kontrol.rows.length > 0) { if(kontrol.rows[0].kullanici_adi === kullanici_adi || kullanici_adi === 'baraykanat') { await pool.query(`DELETE FROM ${tablo} WHERE id = $1`, [id]); res.json({ success: true }); } else { res.status(403).json({ error: "Yetkisiz." }); } } else { res.status(404).json({ error: "Bulunamadı." }); } } catch (e) { res.status(500).json({ error: "Hata" }); } });
app.get('/admin/tum-veriler', async (req, res) => { const d = await pool.query('SELECT * FROM ders_yorumlari ORDER BY tarih DESC LIMIT 50'); const y = await pool.query('SELECT * FROM yurt_yorumlari ORDER BY tarih DESC LIMIT 50'); const f = await pool.query('SELECT * FROM forum ORDER BY tarih DESC LIMIT 50'); const m = await pool.query('SELECT * FROM iletisim_mesajlari ORDER BY tarih DESC'); res.json({ ders: d.rows, yurt: y.rows, forum: f.rows, mesajlar: m.rows }); });
app.delete('/admin/sil-mesaj/:id', async (req, res) => { await pool.query(`DELETE FROM iletisim_mesajlari WHERE id=$1`, [req.params.id]); res.json({ success: true }); });
app.post('/admin/banla', async (req, res) => { await pool.query("UPDATE users SET is_banned = true WHERE nickname = $1", [req.body.nickname]); res.json({ success: true }); });

// 🔥 YEMEKHANE YORUM SİSTEMİ 🔥

// 1. Yorumları Getir
app.get('/yemek-yorumlari', async (req, res) => {
    try {
        const { tarih } = req.query; // ?tarih=04.12.2025
        
        const anaYorumlar = await pool.query(
            "SELECT * FROM yemek_yorumlari WHERE tarih_str = $1 AND ust_id = 0 ORDER BY created_at DESC", 
            [tarih]
        );
        
        const cevaplar = await pool.query(
            "SELECT * FROM yemek_yorumlari WHERE tarih_str = $1 AND ust_id != 0 ORDER BY created_at ASC", 
            [tarih]
        );

        const sonuc = anaYorumlar.rows.map(ana => ({
            ...ana,
            cevaplar: cevaplar.rows.filter(c => c.ust_id === ana.id)
        }));

        res.json(sonuc);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Hata" });
    }
});

// 2. Yorum Ekle (🔥 DÜZELTİLDİ: created_at eklendi)
app.post('/yemek-yorum-ekle', async (req, res) => {
    try {
        const { tarih, kullanici_adi, yorum, ust_id } = req.body;
        
        // NOW() fonksiyonu ile şu anki zamanı veritabanına kaydediyoruz
        await pool.query(
            "INSERT INTO yemek_yorumlari (tarih_str, kullanici_adi, yorum_metni, ust_id, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [tarih, kullanici_adi, yorum, ust_id || 0]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error("Yemek Yorum Ekleme Hatası:", err);
        res.status(500).json({ error: "Hata" });
    }
}); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor!`))