"use client";

import { useState } from "react";
import "./login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法登入");
      if (mode === "signup") { setMode("login"); setPassword(""); setMessage("申請已送出，請由 Wesley 核准後再登入。"); }
      else window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "目前無法登入"); }
    finally { setBusy(false); }
  }

  return <main className="login-shell"><section className="login-card"><div className="login-mark">WD</div><p className="login-kicker">WESLEY DANDY</p><h1>W.D SalonHub</h1><p className="login-copy">叫貨、客戶履歷、燙染配方與照片，集中在同一個工作台。</p><form onSubmit={submit}><label>帳號<input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="輸入設計師姓名" autoComplete="username" /></label><label>密碼<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="輸入密碼" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{message && <p className="login-message">{message}</p>}<button disabled={busy}>{busy ? "處理中…" : mode === "login" ? "登入工作台" : "送出新帳號申請"}</button></form><button className="login-switch" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "新朋友申請帳號" : "返回登入"}</button></section></main>;
}
