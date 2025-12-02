require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const GIZLI_ANAHTAR = "cukurova_cok_gizli_anahtar_123";

// --- MAİL AYARLARI ---
const GMAIL_USER = process.env.MAIL_KULLANICI;
// Şifredeki boşlukları otomatik silen yapı (Render'a boşluklu girsen de çalışır)
const GMAIL_PASS = process.env.MAIL_SIFRE ? process.env.MAIL_SIFRE.replace(/\s+/g, '') : "";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

// Bağlantı testi
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Mail Sunucusu Hatası:", error);
    } else {
        console.log("✅ Mail sunucusu hazır ve şifre doğrulandı!");
    }
});

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

client.connect().then(() => console.log("✅ Veritabanı Bağlı")).catch(err => console.error("❌ DB Hatası:", err));

// --- API ENDPOINTLERİ ---

// 🔥 1. KOD GÖNDERME (HIZLANDIRILMIŞ VERSİYON)
app.post('/kod-gonder', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`Mail işlem isteği: ${email}`);

        // Kullanıcı var mı kontrol et
        const userCheck = await client.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) return res.status(400).json({ error: "Bu mail zaten kayıtlı." });
        
        // 6 haneli kodu oluştur
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 🔥 ÖNCE VERİTABANINA YAZ (Hızlı İşlem)
        await client.query("DELETE FROM verification_codes WHERE email = $1", [email]); 
        await client.query("INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')", [email, code]);

        // 🔥 KULLANICIYI BEKLETME, HEMEN CEVAP VER
        res.json({ success: true, message: "Kod gönderildi." });

        // 🔥 MAİLİ ARKA PLANDA GÖNDER (Await YOK)
        transporter.sendMail({ 
            from: '"Çukurova Kampüs" <cukampus2025@gmail.com>', 
            to: email, 
            subject: 'Doğrulama Kodun', 
            html: `
                <div style="background:#f4f4f4; padding:20px; font-family:sans-serif;">
                    <div style="background:white; max-width:500px; margin:0 auto; padding:20px; border-radius:10px; text-align:center;">
                        <h2 style="color:#004aad;">Hoş Geldin!</h2>
                        <p>Kayıt olmak için doğrulama kodun:</p>
                        <h1 style="letter-spacing:5px; background:#eee; padding:10px; border-radius:5px;">${code}</h1>
                        <p style="color:#999; font-size:12px;">Bu kod 5 dakika geçerlidir.</p>
                    </div>
                </div>
            ` 
        }).catch(mailError => {
            // Mail gitmezse sunucu loguna yaz, ama kullanıcıyı etkileme
            console.error(`❌ Mail gönderme hatası (${email}):`, mailError);
        });

        console.log("✅ Kod üretildi, cevap verildi, mail kuyruğa alındı.");

    } catch (err) { 
        console.error("❌ Genel Hata:", err);
        // Eğer veritabanı aşamasında patlarsa hata dön
        if (!res.headersSent) {
            res.status(500).json({ error: "İşlem sırasında bir hata oluştu." }); 
        }
    }
});

// 🔥 2. YORUMLARI ÇEKME
app.get('/ders-yorumlari/:kod', async (req, res) => { 
    try {
        const anaYorumlarRes = await client.query('SELECT * FROM ders_yorumlari WHERE ders_kodu = $1 AND (ust_id = 0 OR ust_id IS NULL) ORDER BY tarih DESC', [req.params.kod]);
        const cevaplarRes = await client.query('SELECT * FROM ders_yorumlari WHERE ders_kodu = $1 AND ust_id != 0 ORDER BY tarih ASC', [req.params.kod]);
        const birlesmisVeri = anaYorumlarRes.rows.map(ana => ({
            ...ana,
            cevaplar: cevaplarRes.rows.filter(c => c.ust_id === ana.id)
        }));
        res.json(birlesmisVeri);
    } catch(e) { res.json([]); }
});

// 🔥 3. YORUM EKLEME
app.post('/ders-yorum-ekle', async (req, res) => { 
    try {
        const ustId = parseInt(req.body.ust_id) || 0;
        await client.query('INSERT INTO ders_yorumlari (ders_kodu, ders_adi, kullanici_adi, yorum_metni, ust_id) VALUES ($1, $2, $3, $4, $5)', 
        [req.body.ders_kodu, req.body.ders_adi, req.body.kullanici_adi, req.body.yorum_metni, ustId]); 
        res.json({ success: true }); 
    } catch(e) { res.status(500).json({ error: "Hata" }); }
});

// --- DİĞERLERİ ---
app.post('/kayit-tamamla', async (req, res) => {
    try {
        const { email, password, nickname, code } = req.body;
        const kodCheck = await client.query("SELECT * FROM verification_codes WHERE email = $1 AND code = $2", [email, code]);
        if (kodCheck.rows.length === 0) return res.status(400).json({ error: "Kod hatalı." });
        const nickCheck = await client.query("SELECT * FROM users WHERE nickname = $1", [nickname]);
        if (nickCheck.rows.length > 0) return res.status(400).json({ error: "Bu isim alınmış." });
        const hash = await bcrypt.hash(password, 10);
        await client.query("INSERT INTO users (email, password, nickname, role) VALUES ($1, $2, $3, 'ogrenci')", [email, hash, nickname]);
        await client.query("DELETE FROM verification_codes WHERE email = $1", [email]); 
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Hata" }); }
});

app.post('/giris', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: "Kullanıcı yok." });
        const user = result.rows[0];
        if (user.is_banned) return res.status(403).json({ error: "Banlandınız." });
        if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: "Şifre yanlış." });
        const token = jwt.sign({ id: user.id, nickname: user.nickname, role: user.role }, GIZLI_ANAHTAR);
        res.json({ success: true, token, user: { nickname: user.nickname, role: user.role } });
    } catch (err) { res.status(500).json({ error: "Giriş hatası." }); }
});

app.get('/bolumler', async (req, res) => { const r = await client.query('SELECT DISTINCT fakulte, bolum FROM dersler ORDER BY fakulte, bolum'); res.json(r.rows); });
app.get('/hocalar', async (req, res) => { const r = await client.query("SELECT DISTINCT hoca_adi FROM dersler WHERE hoca_adi != 'Belirtilmemiş' ORDER BY hoca_adi"); res.json(r.rows); });
app.get('/dersler/:bolum', async (req, res) => { const r = await client.query('SELECT * FROM dersler WHERE bolum = $1', [req.params.bolum]); res.json(r.rows); });
app.get('/hoca-dersleri/:hoca', async (req, res) => { const r = await client.query('SELECT * FROM dersler WHERE hoca_adi = $1', [req.params.hoca]); res.json(r.rows); });
app.get('/toplam-yorum-sayisi', async (req, res) => { try { const r = await client.query(`SELECT (SELECT COUNT(*) FROM ders_yorumlari) + (SELECT COUNT(*) FROM yurt_yorumlari) + (SELECT COUNT(*) FROM forum) as toplam`); res.json({ toplam: parseInt(r.rows[0].toplam || 0) }); } catch { res.json({ toplam: 0 }); }});
app.get('/yurt-yorumlari/:yurt', async (req, res) => { const r = await client.query('SELECT * FROM yurt_yorumlari WHERE yurt_adi = $1 ORDER BY tarih DESC', [req.params.yurt]); res.json(r.rows); });
app.post('/yurt-yorum-ekle', async (req, res) => { await client.query('INSERT INTO yurt_yorumlari (yurt_adi, yorum_metni, kullanici_adi) VALUES ($1, $2, $3)', [req.body.yurt_adi, req.body.yorum_metni, req.body.kullanici_adi]); res.json({ success: true }); });
app.post('/iletisim-gonder', async (req, res) => { await client.query('INSERT INTO iletisim_mesajlari (mesaj) VALUES ($1)', [req.body.mesaj]); res.json({ success: true }); });
app.get('/forum/:tur', async (req, res) => { const ana = await client.query('SELECT * FROM forum WHERE tur = $1 AND ust_id = 0 ORDER BY tarih DESC', [req.params.tur]); const cev = await client.query('SELECT * FROM forum WHERE tur = $1 AND ust_id != 0 ORDER BY tarih ASC', [req.params.tur]); const sonuc = ana.rows.map(s => ({ ...s, cevaplar: cev.rows.filter(c => c.ust_id === s.id) })); res.json(sonuc); });
app.post('/forum-ekle', async (req, res) => { await client.query('INSERT INTO forum (tur, ust_id, kullanici_adi, mesaj) VALUES ($1, $2, $3, $4)', [req.body.tur, req.body.ust_id||0, req.body.kullanici_adi, req.body.mesaj]); res.json({ success: true }); });
app.post('/yorum-sil', async (req, res) => { try { const { tur, id, kullanici_adi } = req.body; let tablo = tur === 'ders' ? "ders_yorumlari" : tur === 'yurt' ? "yurt_yorumlari" : "forum"; const kontrol = await client.query(`SELECT * FROM ${tablo} WHERE id = $1`, [id]); if(kontrol.rows.length > 0) { if(kontrol.rows[0].kullanici_adi === kullanici_adi || kullanici_adi === 'baraykanat') { await client.query(`DELETE FROM ${tablo} WHERE id = $1`, [id]); res.json({ success: true }); } else { res.status(403).json({ error: "Yetkisiz." }); } } else { res.status(404).json({ error: "Bulunamadı." }); } } catch (e) { res.status(500).json({ error: "Hata" }); } });

app.get('/admin/tum-veriler', async (req, res) => { const d = await client.query('SELECT * FROM ders_yorumlari ORDER BY tarih DESC LIMIT 50'); const y = await client.query('SELECT * FROM yurt_yorumlari ORDER BY tarih DESC LIMIT 50'); const f = await client.query('SELECT * FROM forum ORDER BY tarih DESC LIMIT 50'); const m = await client.query('SELECT * FROM iletisim_mesajlari ORDER BY tarih DESC'); res.json({ ders: d.rows, yurt: y.rows, forum: f.rows, mesajlar: m.rows }); });
app.delete('/admin/sil-mesaj/:id', async (req, res) => { await client.query(`DELETE FROM iletisim_mesajlari WHERE id=$1`, [req.params.id]); res.json({ success: true }); });
app.post('/admin/banla', async (req, res) => { await client.query("UPDATE users SET is_banned = true WHERE nickname = $1", [req.body.nickname]); res.json({ success: true }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Sunucu ${PORT} portunda çalışıyor!`));