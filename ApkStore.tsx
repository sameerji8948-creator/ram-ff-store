import { useEffect, useState } from 'react'
import { Smartphone, Download, Link2, X, Check, RefreshCw, ShieldCheck, Clock, Trash2 } from 'lucide-react'
import { requireSupabase, isSupabaseConfigured } from './supabase'

type Apk = { id: string; title: string; version: string; description: string; price: number; file_size: number | null; created_at: string; status?: string }
type ApkOrder = { id: string; apk_id: string; phone_company: string; phone_model: string | null; utr: string; price: number; status: 'pending_verification' | 'approved' | 'rejected'; created_at: string; product_title?: string | null; profiles?: { email: string; name: string } | null }
type Props = { user: { id: string; email: string; name: string } | null; isAdmin: boolean; toast: (t: string) => void; qr: string; upiId: string; upiName: string; onLogin: () => void; adminOnly?: boolean }

const COMPANIES = ['Samsung', 'Xiaomi', 'Redmi', 'POCO', 'Realme', 'Oppo', 'Vivo', 'iQOO', 'OnePlus', 'Motorola', 'Infinix', 'Tecno', 'Itel', 'Lava', 'Google Pixel', 'Nothing', 'Other']
const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN')
const MF = /^https:\/\/(www\.)?mediafire\.com\//i
const badge = (s: string) => s === 'approved' ? 'text-[#72c6a0] border-[#72c6a0]/30 bg-[#72c6a0]/10' : s === 'rejected' ? 'text-[#ff7b7b] border-[#ff7b7b]/30 bg-[#ff7b7b]/10' : 'text-[#ff7a1a] border-[#ff7a1a]/30 bg-[#ff7a1a]/10'
const inp = 'w-full h-[44px] rounded-[12px] bg-[#0b1020] border border-[#263650] px-4 text-[14px] outline-none focus:border-[#00d4ff]/60 placeholder:text-[#566]'

export default function ApkStore({ user, isAdmin, toast, qr, upiId, upiName, onLogin, adminOnly }: Props) {
  const [apks, setApks] = useState<Apk[]>([])
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<ApkOrder[]>([])
  const [buying, setBuying] = useState<Apk | null>(null)
  const [form, setForm] = useState({ company: '', model: '', utr: '' })
  const [busy, setBusy] = useState(false)
  const [adminApks, setAdminApks] = useState<Apk[]>([])
  const [nf, setNf] = useState({ title: '', version: '1.0', description: '', price: '', link: '' })

  const load = async () => {
    if (!isSupabaseConfigured) return
    const c = requireSupabase()
    setLoading(true)
    const { data, error } = await c.rpc('get_available_apks')
    if (error) toast('Panel store is not ready. Please run the latest supabase/schema.sql'); else setApks(data || [])
    setLoading(false)
    if (user) {
      const q = isAdmin ? c.from('apk_orders').select('*, profiles(email,name)') : c.from('apk_orders').select('*')
      const r = await q.order('created_at', { ascending: false }).limit(200)
      if (!r.error) setOrders((r.data as any) || [])
      if (isAdmin) { const a = await c.from('apk_products').select('*').order('created_at', { ascending: false }); if (!a.error) setAdminApks(a.data || []) }
    }
  }
  useEffect(() => { load() }, [user?.id, isAdmin])

  const startBuy = (a: Apk) => { if (!user) { toast('Please log in first'); onLogin(); return } setForm({ company: '', model: '', utr: '' }); setBuying(a) }

  const submitOrder = async () => {
    if (!buying) return
    if (!form.company) { toast('Please select your phone company'); return }
    if (form.utr.trim().length < 6) { toast('Please enter a valid UTR number'); return }
    setBusy(true)
    const { error } = await requireSupabase().from('apk_orders').insert({ apk_id: buying.id, phone_company: form.company, phone_model: form.model.trim() || null, utr: form.utr.trim() })
    setBusy(false)
    if (error) { toast(error.message.includes('duplicate') ? 'This UTR has already been used' : error.message); return }
    toast('Order submitted. The admin will verify your payment and approve it.')
    setBuying(null); load()
  }

  // Server creates a private link that works for 2 minutes and then forwards to the MediaFire page.
  const download = async (o: ApkOrder) => {
    const w = window.open('about:blank', '_blank')
    const { data, error } = await requireSupabase().functions.invoke('panel-link', { body: { orderId: o.id } })
    if (error || !data?.url) { w?.close(); toast('Could not create the link. Please try again shortly.'); return }
    if (w) w.location.href = data.url; else window.location.href = data.url
    toast('This link is valid for 2 minutes. If it expires, tap Download again.')
  }

  const addApk = async () => {
    const price = Number(nf.price)
    if (!nf.title.trim() || !Number.isFinite(price) || price <= 0) { toast('Name and price are required'); return }
    if (!MF.test(nf.link.trim())) { toast('Enter a valid MediaFire link (https://www.mediafire.com/...)'); return }
    setBusy(true)
    const ins = await requireSupabase().from('apk_products').insert({ title: nf.title.trim(), version: nf.version.trim() || '1.0', description: nf.description.trim(), price, download_url: nf.link.trim(), created_by: user!.id })
    setBusy(false)
    if (ins.error) { toast(ins.error.message); return }
    setNf({ title: '', version: '1.0', description: '', price: '', link: '' }); toast('Panel added'); load()
  }

  const setOrder = async (o: ApkOrder, status: 'approved' | 'rejected') => {
    const { error } = await requireSupabase().from('apk_orders').update({ status }).eq('id', o.id)
    if (error) toast(error.message); else { toast(status === 'approved' ? 'Order approved' : 'Order rejected'); load() }
  }
  const toggleApk = async (a: Apk) => {
    const { error } = await requireSupabase().from('apk_products').update({ status: a.status === 'available' ? 'disabled' : 'available' }).eq('id', a.id)
    if (error) toast(error.message); else load()
  }
  const delApk = async (a: Apk) => {
    if (!window.confirm('Delete this Panel?')) return
    const { error } = await requireSupabase().from('apk_products').delete().eq('id', a.id)
    if (error) toast('Cannot delete (it has orders). Disable it instead.'); else load()
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {!adminOnly && <>
      <div className="rounded-[24px] border border-[#0e3a4a] bg-[radial-gradient(ellipse_at_top_right,rgba(0,212,255,.14),transparent_55%),#0a1620] p-6 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00d4ff]/25 bg-[#00d4ff]/10 px-3 py-1.5 text-[10px] font-[800] tracking-[.16em] text-[#00d4ff]"><Smartphone className="w-3.5 h-3.5" /> PANEL STORE</div>
        <h1 className="display mt-4 text-[clamp(30px,5vw,52px)] font-[900] leading-[.98]">Buy <span className="text-[#00d4ff]">Panel</span></h1>
        <div className="mt-2 text-[14px] font-[700] text-[#00d4ff]">Instant access. Verified delivery.</div>
        <p className="mt-3 max-w-[620px] text-[13px] sm:text-[15px] leading-6 text-[#9ab3c4]">Check the price, choose your phone company, pay by UPI and submit your UTR. Once payment is verified, a Download button appears in My Panel Orders.</p>
      </div>

      <div className="mt-7 flex items-end justify-between"><h2 className="display text-[22px] font-[800]">Available Panels</h2><span className="rounded-full border border-[#263650] bg-[#111827] px-3 py-1.5 text-[11px] text-[#9aa9bd]">{apks.length} available</span></div>
      {loading ? <div className="mt-5 rounded-2xl border border-[#263650] bg-[#101827] p-10 text-center text-[13px] text-[#9aa9bd]"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading...</div>
        : apks.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[#2a4a38] bg-[#0a1620] p-12 text-center text-[13px] text-[#9ab3c4]">No Panels are available right now.</div>
        : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{apks.map(a => (
          <article key={a.id} className="rounded-[18px] border border-[#16394a] bg-[#0c1824] p-5">
            <div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00d4ff]/10 text-[#00d4ff]"><Smartphone className="h-6 w-6" /></div><span className="rounded-full border border-[#00d4ff]/25 bg-[#00d4ff]/10 px-2.5 py-1 text-[9px] font-[800] text-[#00d4ff]">v{a.version}</span></div>
            <h3 className="mt-4 text-[17px] font-[800]">{a.title}</h3>
            <p className="mt-1 min-h-[36px] text-[12px] leading-5 text-[#8aa3b4]">{a.description || 'Panel file'}</p>
            <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#0b1020] p-3"><div className="text-[9px] uppercase tracking-wider text-[#718096]">Delivery</div><div className="mt-1 text-[15px] font-[800]">Private link</div></div><div className="rounded-xl bg-[#0b1020] p-3"><div className="text-[9px] uppercase tracking-wider text-[#718096]">Price</div><div className="mt-1 text-[17px] font-[900] text-[#00d4ff]">{inr(a.price)}</div></div></div>
            <button onClick={() => startBuy(a)} className="mt-4 h-11 w-full rounded-[10px] bg-[#00d4ff] text-[13px] font-[900] text-black hover:brightness-110">Buy Panel</button>
          </article>))}</div>}

      {user && <div className="mt-10"><h2 className="display text-[20px] font-[800]">My Panel Orders</h2>
        <div className="mt-4 space-y-3">{orders.filter(o => isAdmin ? o.profiles?.email === user.email : true).length === 0 && <div className="text-[12px] text-[#77849a]">No orders yet.</div>}
          {orders.filter(o => isAdmin ? o.profiles?.email === user.email : true).map(o => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#263650] bg-[#101827] p-4">
              <div><div className="text-[14px] font-[800]">{o.product_title}</div><div className="mt-1 text-[11px] text-[#8896ab]">{o.phone_company}{o.phone_model ? ' • ' + o.phone_model : ''} • UTR {o.utr} • {inr(o.price)}</div></div>
              <div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-[800] ${badge(o.status)}`}>{o.status === 'pending_verification' ? 'PAYMENT CHECK PENDING' : o.status.toUpperCase()}</span>
                {o.status === 'approved' && <button onClick={() => download(o)} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#00d4ff] px-3 text-[12px] font-[900] text-black"><Download className="h-4 w-4" />Download</button>}</div>
            </div>))}</div></div>}

      </>}
      {isAdmin && <div className={(adminOnly ? "" : "mt-12 ") + "rounded-[20px] border border-[#4a2a12] bg-[#1a0f06] p-5 sm:p-6"}>
        <h2 className="display text-[20px] font-[800] text-[#ff7a1a]">Admin: Panel Manager</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className={inp} placeholder="Panel name" value={nf.title} onChange={e => setNf({ ...nf, title: e.target.value })} />
          <input className={inp} placeholder="Price (₹)" inputMode="decimal" value={nf.price} onChange={e => setNf({ ...nf, price: e.target.value })} />
          <input className={inp} placeholder="Version (e.g. 1.0)" value={nf.version} onChange={e => setNf({ ...nf, version: e.target.value })} />
          <div className="relative"><Link2 className="absolute left-3 top-[14px] h-4 w-4 text-[#cbb27a]" /><input className={inp + ' pl-9'} placeholder="MediaFire link (https://www.mediafire.com/...)" value={nf.link} onChange={e => setNf({ ...nf, link: e.target.value })} /></div>
          <textarea className={inp + ' h-[80px] py-3 sm:col-span-2'} placeholder="Short description" value={nf.description} onChange={e => setNf({ ...nf, description: e.target.value })} />
        </div>
        <button disabled={busy} onClick={addApk} className="mt-3 h-11 rounded-[10px] bg-[#ff7a1a] px-5 text-[13px] font-[900] text-black disabled:opacity-50">{busy ? 'Saving...' : 'Add Panel'}</button>
        <div className="mt-6 space-y-2">{adminApks.map(a => (<div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#0b0d12] p-3 text-[12px]"><span>{a.title} v{a.version} • {inr(a.price)} • {a.status}</span><span className="flex gap-2"><button onClick={() => toggleApk(a)} className="rounded-lg border border-[#333] px-3 py-1.5">{a.status === 'available' ? 'Disable' : 'Enable'}</button><button onClick={() => delApk(a)} className="rounded-lg border border-[#5a2a2a] px-2.5 py-1.5 text-[#ff7b7b]"><Trash2 className="h-3.5 w-3.5" /></button></span></div>))}</div>
        <h3 className="mt-8 text-[15px] font-[800]">All Panel Orders</h3>
        <div className="mt-3 space-y-2">{orders.length === 0 && <div className="text-[12px] text-[#77849a]">No orders.</div>}
          {orders.map(o => (<div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0b0d12] p-3">
            <div className="text-[12px]"><div className="font-[800]">{o.product_title} • {inr(o.price)}</div><div className="mt-1 text-[#8896ab]">{o.profiles?.name} ({o.profiles?.email})</div><div className="text-[#ff7a1a]">Phone: {o.phone_company}{o.phone_model ? ' • ' + o.phone_model : ''} • UTR: {o.utr}</div></div>
            <div className="flex items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-[800] ${badge(o.status)}`}>{o.status.replace('_', ' ').toUpperCase()}</span>
              {o.status === 'pending_verification' && <><button onClick={() => setOrder(o, 'approved')} className="flex h-8 items-center gap-1 rounded-lg bg-[#00d4ff] px-3 text-[11px] font-[900] text-black"><Check className="h-3.5 w-3.5" />Approve</button><button onClick={() => setOrder(o, 'rejected')} className="h-8 rounded-lg border border-[#5a2a2a] px-3 text-[11px] text-[#ff7b7b]">Reject</button></>}</div></div>))}</div>
      </div>}

      {!adminOnly && <>
      <div className="mt-6 rounded-[14px] border border-[#344660] bg-[#111827] p-4 text-[11px] leading-5 text-[#9aa9bd]"><span className="font-[800] text-[#00d4ff]">Note:</span> Submitting a UTR is not proof of payment. The admin approves an order only after checking the money in the bank/UPI account. Use this product at your own risk.</div>

      {buying && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={() => setBuying(null)}>
        <div className="max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-[24px] border border-[#263650] bg-[#0f1624] p-5 sm:rounded-[24px]" onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between"><div><div className="text-[11px] font-[800] tracking-wider text-[#00d4ff]">CHECKOUT</div><h3 className="mt-1 text-[18px] font-[800]">{buying.title}</h3></div><button onClick={() => setBuying(null)} className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-5 w-5" /></button></div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0b1020] p-3"><span className="text-[12px] text-[#8896ab]">Total price</span><span className="text-[20px] font-[900] text-[#00d4ff]">{inr(buying.price)}</span></div>
          <label className="mt-4 block text-[12px] font-[700] text-[#c7d2e2]">Phone Company *</label>
          <div className="mt-2 flex flex-wrap gap-2">{COMPANIES.map(c => <button key={c} onClick={() => setForm({ ...form, company: c })} className={`rounded-full border px-3 py-1.5 text-[12px] ${form.company === c ? 'border-[#00d4ff] bg-[#00d4ff]/15 text-[#00d4ff]' : 'border-[#263650] text-[#9aa9bd]'}`}>{c}</button>)}</div>
          <input className={inp + ' mt-3'} placeholder="Phone model (optional), e.g. Redmi Note 12" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
          <div className="mt-5 rounded-xl border border-[#263650] bg-[#0b1020] p-4 text-center"><img src={qr} alt="UPI QR" className="mx-auto h-[170px] w-[170px] rounded-lg bg-white object-contain p-1" /><div className="mt-2 text-[11px] text-[#8896ab]">Scan with any UPI app</div><div className="mt-1 text-[11px] text-[#00d4ff]">Pay exactly {inr(buying.price)}</div></div>
          <input className={inp + ' mt-4'} placeholder="UTR / Transaction ID *" value={form.utr} onChange={e => setForm({ ...form, utr: e.target.value })} />
          <button disabled={busy} onClick={submitOrder} className="mt-4 h-12 w-full rounded-[12px] bg-[#00d4ff] text-[14px] font-[900] text-black disabled:opacity-50">{busy ? 'Submitting...' : 'Submit UTR & Order'}</button>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#718096]"><Clock className="h-3 w-3" />Download unlocks after admin verification <ShieldCheck className="h-3 w-3" /></div>
        </div></div>}
      </>}
    </div>
  )
}

const LEGAL: Record<string, { t: string; p: string[] }> = {
  terms: { t: 'Terms of Service', p: ['By using this website you agree to these terms. You are responsible for keeping your account secure.', 'Buying or selling Free Fire accounts or in-game items may violate the game publisher\'s Terms of Service and can lead to account bans. This risk is yours; the platform is not responsible for any ban, loss or policy action.', 'Install or use digital products at your own risk. Only sell items you have full rights to.', 'Payments are verified manually. Submitting a UTR is not proof of payment, and this is not a regulated escrow service.', 'Accounts may be blocked for fraud, fake listings or false information.'] },
  privacy: { t: 'Privacy Policy', p: ['We store your name, email, phone company/model, UTR and chat or listing media only to process orders and provide support.', 'Data is stored on Supabase. We do not sell your data.', 'Never share your password, OTP or recovery codes with anyone. We will never ask for them.', 'Contact support to request deletion of your data.'] },
  refund: { t: 'Refund & Dispute Policy', p: ['An order can be cancelled before payment is verified. Orders with a wrong UTR are rejected.', 'Digital files are not refundable after download, unless the file does not open or does not match the order.', 'For a dispute, contact support with your order ID and UTR. The admin reviews both sides and makes a decision.'] },
}
export function LegalModal({ doc, onClose }: { doc: string; onClose: () => void }) {
  const d = LEGAL[doc]; if (!d) return null
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={onClose}><div className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-[20px] border border-[#263650] bg-[#0f1624] p-6" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="text-[18px] font-[800]">{d.t}</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div><ul className="mt-4 space-y-3 text-[13px] leading-6 text-[#aab5c7]">{d.p.map((x, i) => <li key={i}>• {x}</li>)}</ul></div></div>
}
