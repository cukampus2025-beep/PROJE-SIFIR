import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

function Home() {
  const [kullanici, setKullanici] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="home-container">

      {/* 🔵 BAŞLIK BURAYA TAŞINDI */}
      <header className="desktop-header" style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ color: '#004aad', fontSize: '38px', margin: '0 0 8px 0', fontWeight: '800' }}>
          Çukurova Kampüs
        </h1>
        <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
          Öğrenci Yorum ve Bilgi Platformu
        </p>
      </header>

      <div className="center-col">
        {!kullanici ? (
          <div className="auth-box">
            <h2 style={{ marginBottom: 20 }}>Giriş Yap</h2>
            <button className="btn btn-primary" onClick={() => setKullanici("test")}>
              Giriş Yap (Fake)
            </button>
          </div>
        ) : (
          <div className="logged-box">
            <h2>Hoş geldin!</h2>
            <button className="btn btn-secondary" onClick={() => setKullanici(null)}>
              Çıkış Yap
            </button>
          </div>
        )}

        {/* Menü */}
        <div className="menu-container">
          <Link to="/topluluklar" className="menu-item">
            <span>Topluluklar</span>
          </Link>
          <Link to="/iletisim" className="menu-item">
            <span>İletişim</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Topluluklar() {
  return (
    <div className="sayfa-container">
      <h2>Topluluklar</h2>

      {/* 🔵 BU KISIM SARIDI —–> BEYAZ YAPILDI */}
      <div
        style={{
          marginTop: "40px",
          padding: "40px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          border: "2px dashed #cccccc"
        }}
      >
        <h3 style={{ marginTop: 0 }}>Topluluk Bilgileri</h3>
        <p>Buraya topluluk bilgileri gelecek...</p>
      </div>
    </div>
  );
}

function Iletisim() {
  return (
    <div className="sayfa-container">
      <h2>İletişim</h2>
      <p>Mail: destek@cukampus.com</p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/topluluklar" element={<Topluluklar />} />
        <Route path="/iletisim" element={<Iletisim />} />
      </Routes>
    </Router>
  );
}

export default App;
