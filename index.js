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
const GMAIL_USER = "cukampus2025@gmail.com"; 
const GMAIL_PASS = "ncqd wqwe zohx hrsi"; // Senin şifren

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

client.connect().then(() => console.log("✅ Veritabanına Bağlanıldı!")).catch(err => console.error("❌ Bağlantı Hatası:", err));

// --- 1. GÜVENLİK ve AKTİVASYON ---
app.post('/kod-gonder', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email.endsWith('@ogr.cu.edu.tr')) return res.status(400).json({ error: "Sadece öğrenci maili (@ogr.cu.edu.tr) kabul edilir." });
        const userCheck = await client.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) return res.status(400).json({ error: "Bu mail zaten kayıtlı." });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60000);
        await client.query("DELETE FROM verification_codes WHERE email = $1", [email]); 
        await client.query("INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)", [email, code, expiresAt]);
        await transporter.sendMail({ from: '"Çukurova Kampüs" <cukampus2025@gmail.com>', to: email, subject: 'Doğrulama Kodun: ' + code, text: `Kodun: ${code}` });
        res.json({ success: true, message: "Kod gönderildi." });
    } catch (err) { res.status(500).json({ error: "Mail hatası." }); }
});

app.post('/kayit-tamamla', async (req, res) => {
    try {
        const { email, password, nickname, code } = req.body;
        const kodCheck = await client.query("SELECT * FROM verification_codes WHERE email = $1", [email]);
        if (kodCheck.rows.length === 0) return res.status(400).json({ error: "Kod bulunamadı." });
        const kayit = kodCheck.rows[0];
        if (kayit.code !== code) return res.status(400).json({ error: "Hatalı kod!" });
        
        const nickCheck = await client.query("SELECT * FROM users WHERE nickname = $1", [nickname]);
        if (nickCheck.rows.length > 0) return res.status(400).json({ error: "Bu takma ad alınmış." });
        const yasakli = ['admin', 'baraykanat', 'yonetici'];
        if (yasakli.includes(nickname.toLowerCase())) return res.status(400).json({ error: "Yasaklı isim." });

        const hash = await bcrypt.hash(password, 10);
        await client.query("INSERT INTO users (email, password, nickname, role) VALUES ($1, $2, $3, 'ogrenci')", [email, hash, nickname]);
        await client.query("DELETE FROM verification_codes WHERE email = $1", [email]); 
        res.json({ success: true, message: "Kayıt başarılı!" });
    } catch (err) { res.status(500).json({ error: "Kayıt hatası." }); }
});

app.post('/giris', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userResult = await client.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) return res.status(400).json({ error: "Kullanıcı bulunamadı." });
        const user = userResult.rows[0];
        if (user.is_banned) return res.status(403).json({ error: "⛔ Banlandınız." });
        if (!await bcrypt.compare(password, user.password)) return res.status(400).json({ error: "Şifre yanlış." });
        const token = jwt.sign({ id: user.id, nickname: user.nickname, role: user.role }, GIZLI_ANAHTAR, { expiresIn: '30d' });
        res.json({ success: true, token, user: { nickname: user.nickname, role: user.role } });
    } catch (err) { res.status(500).json({ error: "Giriş hatası." }); }
});

// --- 2. VERİLER ---
app.get('/bolumler', async (req, res) => { const r = await client.query('SELECT DISTINCT fakulte, bolum FROM dersler ORDER BY fakulte, bolum'); res.json(r.rows); });
app.get('/hocalar', async (req, res) => { const r = await client.query("SELECT DISTINCT hoca_adi FROM dersler WHERE hoca_adi != 'Belirtilmemiş' ORDER BY hoca_adi"); res.json(r.rows); });
app.get('/dersler/:bolum', async (req, res) => { const r = await client.query('SELECT * FROM dersler WHERE bolum = $1', [req.params.bolum]); res.json(r.rows); });
app.get('/hoca-dersleri/:hoca', async (req, res) => { const r = await client.query('SELECT * FROM dersler WHERE hoca_adi = $1', [req.params.hoca]); res.json(r.rows); });
app.get('/toplam-yorum-sayisi', async (req, res) => { 
    // Sadece ders, yurt ve forum yorumlarını sayar. İletişim mesajlarını DAHİL ETMEZ.
    const q = `SELECT (SELECT COUNT(*) FROM ders_yorumlari) + (SELECT COUNT(*) FROM yurt_yorumlari) + (SELECT COUNT(*) FROM forum) as toplam`; 
    const r = await client.query(q); 
    res.json({ toplam: parseInt(r.rows[0].toplam) }); 
});

// --- 3. YORUMLAR VE FORUM ---
app.get('/ders-yorumlari/:kod', async (req, res) => { const r = await client.query('SELECT * FROM ders_yorumlari WHERE ders_kodu = $1 ORDER BY tarih DESC', [req.params.kod]); res.json(r.rows); });
app.post('/ders-yorum-ekle', async (req, res) => { await client.query('INSERT INTO ders_yorumlari (ders_kodu, ders_adi, kullanici_adi, yorum_metni) VALUES ($1, $2, $3, $4)', [req.body.ders_kodu, req.body.ders_adi, req.body.kullanici_adi, req.body.yorum_metni]); res.json({ success: true }); });
app.get('/yurt-yorumlari/:yurt', async (req, res) => { const r = await client.query('SELECT * FROM yurt_yorumlari WHERE yurt_adi = $1 ORDER BY tarih DESC', [req.params.yurt]); res.json(r.rows); });
app.post('/yurt-yorum-ekle', async (req, res) => { await client.query('INSERT INTO yurt_yorumlari (yurt_adi, yorum_metni, kullanici_adi) VALUES ($1, $2, $3)', [req.body.yurt_adi, req.body.yorum_metni, req.body.kullanici_adi]); res.json({ success: true }); });
app.post('/iletisim-gonder', async (req, res) => { await client.query('INSERT INTO iletisim_mesajlari (mesaj) VALUES ($1)', [req.body.mesaj]); res.json({ success: true }); });

// FORUM (CEVAPLARI İÇ İÇE GETİRİR)
app.get('/forum/:tur', async (req, res) => {
    const ana = await client.query('SELECT * FROM forum WHERE tur = $1 AND ust_id = 0 ORDER BY tarih DESC', [req.params.tur]);
    const cev = await client.query('SELECT * FROM forum WHERE tur = $1 AND ust_id != 0 ORDER BY tarih ASC', [req.params.tur]);
    const sonuc = ana.rows.map(s => ({ ...s, cevaplar: cev.rows.filter(c => c.ust_id === s.id) }));
    res.json(sonuc);
});
app.post('/forum-ekle', async (req, res) => {
    await client.query('INSERT INTO forum (tur, ust_id, kullanici_adi, mesaj) VALUES ($1, $2, $3, $4)', [req.body.tur, req.body.ust_id||0, req.body.kullanici_adi, req.body.mesaj]);
    res.json({ success: true });
});

// --- 4. SİLME İŞLEMLERİ (HEM ADMİN HEM KULLANICI İÇİN) ---
app.post('/yorum-sil', async (req, res) => {
    try {
        const { tur, id, kullanici_adi } = req.body;
        let tablo = tur === 'ders' ? "ders_yorumlari" : tur === 'yurt' ? "yurt_yorumlari" : "forum";
        
        // Sadece o kullanıcıya aitse sil
        const kontrol = await client.query(`SELECT * FROM ${tablo} WHERE id = $1`, [id]);
        if(kontrol.rows.length > 0) {
            if(kontrol.rows[0].kullanici_adi === kullanici_adi || kullanici_adi === 'baraykanat') { // Baray her şeyi silebilir
                await client.query(`DELETE FROM ${tablo} WHERE id = $1`, [id]);
                res.json({ success: true });
            } else {
                res.status(403).json({ error: "Bunu silmeye yetkin yok." });
            }
        } else {
            res.status(404).json({ error: "Yorum bulunamadı." });
        }
    } catch (e) { res.status(500).json({ error: "Hata" }); }
});

// --- 5. ADMIN PANELİ ---
app.get('/admin/tum-veriler', async (req, res) => {
    const d = await client.query('SELECT * FROM ders_yorumlari ORDER BY tarih DESC LIMIT 50');
    const y = await client.query('SELECT * FROM yurt_yorumlari ORDER BY tarih DESC LIMIT 50');
    const f = await client.query('SELECT * FROM forum ORDER BY tarih DESC LIMIT 50');
    const m = await client.query('SELECT * FROM iletisim_mesajlari ORDER BY tarih DESC');
    res.json({ ders: d.rows, yurt: y.rows, forum: f.rows, mesajlar: m.rows });
});
app.delete('/admin/sil-mesaj/:id', async (req, res) => {
    await client.query(`DELETE FROM iletisim_mesajlari WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
});
app.post('/admin/banla', async (req, res) => {
    await client.query("UPDATE users SET is_banned = true WHERE nickname = $1", [req.body.nickname]);
    res.json({ success: true });
});

app.listen(5000, () => console.log("🚀 Sunucu 5000'de!"));