"use client"
import { Separator } from "@/components/ui/separator"
import { formatINR, formatDate } from "@/lib/format"
import { numberToWords } from "@/lib/number-to-words"

interface TemplateProps {
  invoice: any
  tenant: any
  party: any
}

// Get unique HSN/SAC rates for summary table
function getHsnSummary(invoice: any) {
  const map = new Map<string, { taxable: number; cgst: number; sgst: number; igst: number; rate: number; totalTax: number }>()
  for (const item of invoice.items || []) {
    const key = item.hsn || "—"
    const existing = map.get(key) || { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: item.gstRate, totalTax: 0 }
    existing.taxable += item.taxableAmount || 0
    existing.cgst += item.cgst || 0
    existing.sgst += item.sgst || 0
    existing.igst += item.igst || 0
    existing.rate = item.gstRate
    existing.totalTax = existing.cgst + existing.sgst + existing.igst
    map.set(key, existing)
  }
  return Array.from(map.entries()).map(([hsn, v]) => ({ hsn, ...v }))
}

// ============ TEMPLATE 1: MODERN (clean, teal accent) ============
function ModernTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  const hsnSummary = getHsnSummary(invoice)
  const docTitle = invoice.type === "estimate" ? "ESTIMATE" : "TAX INVOICE"
  return (
    <div className="p-6 sm:p-8 bg-white text-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-3">
          {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-16 h-16 object-contain" />}
          <div>
            <h2 className="text-xl font-bold">{tenant?.businessName}</h2>
            {tenant?.legalName && tenant.legalName !== tenant.businessName && <p className="text-xs text-slate-500">{tenant.legalName}</p>}
            <p className="text-xs text-slate-500 mt-1">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}{tenant?.stateCode ? ` - ${tenant.stateCode}` : ""}</p>
            <p className="text-xs text-slate-500">{tenant?.phone && `📞 ${tenant.phone}`}{tenant?.email && ` · ✉ ${tenant.email}`}</p>
            <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
              {tenant?.gstin && <span><b>GSTIN:</b> {tenant.gstin}</span>}
              {tenant?.pan && <span><b>PAN:</b> {tenant.pan}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-2xl font-bold uppercase text-teal-600">{docTitle}</h3>
          <p className="text-[10px] text-slate-400 uppercase mt-1">Original for Recipient</p>
          <div className="mt-2 text-sm">
            <p><span className="text-slate-400 text-xs">Invoice No:</span> <span className="font-semibold">{invoice.invoiceNumber}</span></p>
            <p><span className="text-slate-400 text-xs">Date:</span> {formatDate(invoice.invoiceDate)}</p>
          </div>
        </div>
      </div>
      <Separator className="my-3 bg-teal-600 h-0.5" />

      {/* Bill To + Supply */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 p-3 rounded">
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Bill To</p>
          <p className="font-semibold text-sm">{party?.name}</p>
          {party?.address && <p className="text-xs text-slate-500">{party.address}</p>}
          <p className="text-xs text-slate-500">{party?.city}{party?.state ? `, ${party.state}` : ""}</p>
          <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
            {party?.gstin && <span><b>GSTIN:</b> {party.gstin}</span>}
            {party?.pan && <span><b>PAN:</b> {party.pan}</span>}
          </div>
          {party?.phone && <p className="text-xs text-slate-500">📞 {party.phone}</p>}
        </div>
        <div className="bg-slate-50 p-3 rounded text-sm">
          <p><span className="text-slate-400 text-xs">Place of Supply:</span> {party?.state || "—"}</p>
          <p><span className="text-slate-400 text-xs">Supply Type:</span> {isInter ? "Inter-state (IGST)" : "Intra-state (CGST+SGST)"}</p>
          <p><span className="text-slate-400 text-xs">Status:</span> <span className="capitalize">{invoice.status}</span></p>
        </div>
      </div>

      {/* Items */}
      <ItemsTable invoice={invoice} isInter={isInter} />
      <TotalsBlock invoice={invoice} accentColor="text-teal-600" />
      <AmountInWords invoice={invoice} />
      <HsnSummaryTable invoice={invoice} isInter={isInter} />
      <NotesTermsSignature invoice={invoice} tenant={tenant} />
      {tenant?.bankName && <BankDetails tenant={tenant} variant="modern" />}
    </div>
  )
}

// ============ TEMPLATE 2: CLASSIC (traditional bordered) ============
function ClassicTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  const hsnSummary = getHsnSummary(invoice)
  const docTitle = invoice.type === "estimate" ? "ESTIMATE" : "TAX INVOICE"
  return (
    <div className="p-6 sm:p-8 bg-white text-slate-900 border-2 border-slate-800">
      <div className="text-center mb-4 pb-3 border-b-2 border-slate-800">
        {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-20 h-20 object-contain mx-auto mb-2" />}
        <h2 className="text-2xl font-bold uppercase tracking-wide">{tenant?.businessName}</h2>
        {tenant?.legalName && tenant.legalName !== tenant.businessName && <p className="text-xs text-slate-600">{tenant.legalName}</p>}
        <p className="text-xs text-slate-600 mt-1">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
        <div className="flex justify-center gap-4 text-xs text-slate-600">
          {tenant?.phone && <span>📞 {tenant.phone}</span>}
          {tenant?.email && <span>✉ {tenant.email}</span>}
        </div>
        <div className="flex justify-center gap-4 text-xs font-semibold text-slate-700 mt-0.5">
          {tenant?.gstin && <span>GSTIN: {tenant.gstin}</span>}
          {tenant?.pan && <span>PAN: {tenant.pan}</span>}
        </div>
      </div>
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold uppercase border-2 border-slate-800 inline-block px-8 py-1">{docTitle}</h3>
        <p className="text-[10px] text-slate-500 uppercase mt-1">Original for Recipient</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4 border border-slate-300 p-3 text-sm">
        <div>
          <p className="text-xs font-bold uppercase mb-1">Bill To:</p>
          <p className="font-semibold">{party?.name}</p>
          {party?.address && <p className="text-xs text-slate-600">{party.address}</p>}
          <p className="text-xs text-slate-600">{party?.city}{party?.state ? `, ${party.state}` : ""}</p>
          <div className="flex gap-3 text-xs text-slate-600">
            {party?.gstin && <span>GSTIN: {party.gstin}</span>}
            {party?.pan && <span>PAN: {party.pan}</span>}
          </div>
        </div>
        <div className="text-right text-xs">
          <p><span className="font-bold">Invoice No:</span> {invoice.invoiceNumber}</p>
          <p><span className="font-bold">Date:</span> {formatDate(invoice.invoiceDate)}</p>
          <p><span className="font-bold">Place of Supply:</span> {party?.state || "—"}</p>
          <p><span className="font-bold">Supply:</span> {isInter ? "IGST" : "CGST+SGST"}</p>
        </div>
      </div>
      <ItemsTable invoice={invoice} isInter={isInter} bordered />
      <TotalsBlock invoice={invoice} accentColor="text-slate-900" />
      <AmountInWords invoice={invoice} />
      <HsnSummaryTable invoice={invoice} isInter={isInter} />
      <NotesTermsSignature invoice={invoice} tenant={tenant} />
      {tenant?.bankName && <BankDetails tenant={tenant} variant="classic" />}
    </div>
  )
}

// ============ TEMPLATE 3: PROFESSIONAL (dark header) ============
function ProfessionalTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  const hsnSummary = getHsnSummary(invoice)
  const docTitle = invoice.type === "estimate" ? "ESTIMATE" : "TAX INVOICE"
  return (
    <div className="bg-white text-slate-900">
      <div className="bg-slate-800 text-white p-6 sm:p-8 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-16 h-16 object-contain bg-white p-1 rounded" />}
          <div>
            <h2 className="text-xl font-bold">{tenant?.businessName}</h2>
            {tenant?.legalName && tenant.legalName !== tenant.businessName && <p className="text-xs text-slate-300">{tenant.legalName}</p>}
            <p className="text-xs text-slate-300 mt-1">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
            <div className="flex gap-3 text-xs text-slate-300">
              {tenant?.phone && <span>📞 {tenant.phone}</span>}
              {tenant?.email && <span>✉ {tenant.email}</span>}
            </div>
            <div className="flex gap-3 text-xs text-slate-300">
              {tenant?.gstin && <span>GSTIN: {tenant.gstin}</span>}
              {tenant?.pan && <span>PAN: {tenant.pan}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-2xl font-bold uppercase">{docTitle}</h3>
          <p className="text-[10px] text-slate-400 uppercase mt-1">Original for Recipient</p>
          <p className="text-sm font-semibold mt-2">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate-300">{formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 p-3 rounded">
            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Bill To</p>
            <p className="font-semibold text-sm">{party?.name}</p>
            {party?.address && <p className="text-xs text-slate-500">{party.address}</p>}
            <p className="text-xs text-slate-500">{party?.city}{party?.state ? `, ${party.state}` : ""}</p>
            <div className="flex gap-3 text-xs text-slate-500">
              {party?.gstin && <span>GSTIN: {party.gstin}</span>}
              {party?.pan && <span>PAN: {party.pan}</span>}
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded text-sm">
            <p><span className="text-slate-400 text-xs">Place of Supply:</span> {party?.state || "—"}</p>
            <p><span className="text-slate-400 text-xs">Supply Type:</span> {isInter ? "Inter-state (IGST)" : "Intra-state"}</p>
          </div>
        </div>
        <ItemsTable invoice={invoice} isInter={isInter} />
        <TotalsBlock invoice={invoice} accentColor="text-slate-800" />
        <AmountInWords invoice={invoice} />
        <HsnSummaryTable invoice={invoice} isInter={isInter} />
        <NotesTermsSignature invoice={invoice} tenant={tenant} />
        {tenant?.bankName && <BankDetails tenant={tenant} variant="professional" />}
      </div>
    </div>
  )
}

// ============ TEMPLATE 4: COMPACT (dense, smaller) ============
function CompactTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  const docTitle = invoice.type === "estimate" ? "ESTIMATE" : "TAX INVOICE"
  return (
    <div className="p-4 sm:p-6 bg-white text-slate-900 text-xs">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-12 h-12 object-contain" />}
          <div>
            <h2 className="text-base font-bold">{tenant?.businessName}</h2>
            <p className="text-[10px] text-slate-500">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
            <div className="flex gap-2 text-[10px] text-slate-500">
              {tenant?.gstin && <span>GSTIN: {tenant.gstin}</span>}
              {tenant?.pan && <span>PAN: {tenant.pan}</span>}
              {tenant?.phone && <span>📞 {tenant.phone}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-lg font-bold uppercase text-primary">{docTitle}</h3>
          <p className="text-[9px] text-slate-400 uppercase">Original for Recipient</p>
          <p className="text-[10px] font-semibold mt-1">{invoice.invoiceNumber}</p>
          <p className="text-[10px] text-slate-500">{formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] border-b pb-2">
        <div>
          <span className="font-semibold">Bill To:</span> {party?.name}
          {party?.gstin && ` · GSTIN: ${party.gstin}`}
          {party?.pan && ` · PAN: ${party.pan}`}
          {party?.phone && ` · 📞 ${party.phone}`}
          {party?.address && <div className="text-slate-500">{party.address}, {party?.city}{party?.state ? `, ${party.state}` : ""}</div>}
        </div>
        <div className="text-right">
          <span className="font-semibold">Place of Supply:</span> {party?.state || "—"} · {isInter ? "IGST" : "CGST+SGST"}
        </div>
      </div>
      <ItemsTable invoice={invoice} isInter={isInter} compact />
      <TotalsBlock invoice={invoice} accentColor="text-primary" compact />
      <AmountInWords invoice={invoice} compact />
      <HsnSummaryTable invoice={invoice} isInter={isInter} compact />
      <NotesTermsSignature invoice={invoice} tenant={tenant} compact />
      {tenant?.bankName && <BankDetails tenant={tenant} variant="compact" />}
    </div>
  )
}

// ============ TEMPLATE 5: COLORFUL (gradient accents) ============
function ColorfulTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  const docTitle = invoice.type === "estimate" ? "ESTIMATE" : "TAX INVOICE"
  return (
    <div className="bg-white text-slate-900">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2" />
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-16 h-16 object-contain rounded-lg p-1 bg-purple-50" />}
            <div>
              <h2 className="text-xl font-bold text-purple-700">{tenant?.businessName}</h2>
              {tenant?.legalName && tenant.legalName !== tenant.businessName && <p className="text-xs text-slate-500">{tenant.legalName}</p>}
              <p className="text-xs text-slate-500 mt-1">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
              <div className="flex gap-3 text-xs text-slate-500">
                {tenant?.phone && <span>📞 {tenant.phone}</span>}
                {tenant?.email && <span>✉ {tenant.email}</span>}
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                {tenant?.gstin && <span>GSTIN: {tenant.gstin}</span>}
                {tenant?.pan && <span>PAN: {tenant.pan}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-2xl font-bold uppercase text-pink-600">{docTitle}</h3>
            <p className="text-[10px] text-slate-400 uppercase mt-1">Original for Recipient</p>
            <p className="text-sm font-semibold mt-2">{invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-500">{formatDate(invoice.invoiceDate)}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 capitalize">{invoice.status}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-purple-50 p-3 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Bill To</p>
            <p className="font-semibold text-sm">{party?.name}</p>
            {party?.address && <p className="text-xs text-slate-500">{party.address}</p>}
            <p className="text-xs text-slate-500">{party?.city}{party?.state ? `, ${party.state}` : ""}</p>
            <div className="flex gap-3 text-xs text-slate-500">
              {party?.gstin && <span>GSTIN: {party.gstin}</span>}
              {party?.pan && <span>PAN: {party.pan}</span>}
            </div>
          </div>
          <div className="sm:text-right text-sm">
            <p><span className="text-purple-700 text-xs font-semibold">Place of Supply:</span> {party?.state || "—"}</p>
            <p><span className="text-purple-700 text-xs font-semibold">Supply Type:</span> {isInter ? "Inter-state (IGST)" : "Intra-state (CGST+SGST)"}</p>
          </div>
        </div>
        <ItemsTable invoice={invoice} isInter={isInter} />
        <TotalsBlock invoice={invoice} accentColor="text-purple-700" />
        <AmountInWords invoice={invoice} />
        <HsnSummaryTable invoice={invoice} isInter={isInter} />
        <NotesTermsSignature invoice={invoice} tenant={tenant} />
        {tenant?.bankName && <BankDetails tenant={tenant} variant="colorful" />}
      </div>
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 h-2" />
    </div>
  )
}

// ============ Shared sub-components ============

function ItemsTable({ invoice, isInter, bordered, compact }: { invoice: any; isInter: boolean; bordered?: boolean; compact?: boolean }) {
  const cellPad = compact ? "p-1.5" : "p-2"
  return (
    <div className="overflow-x-auto mb-4">
      <table className={`w-full text-sm ${bordered ? "border border-slate-300" : ""}`}>
        <thead className="bg-muted/30">
          <tr className={bordered ? "border-b border-slate-300" : "border-b"}>
            <th className={`text-left ${cellPad} text-xs font-medium uppercase w-8 ${bordered ? "border-r border-slate-300" : ""}`}>#</th>
            <th className={`text-left ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>Item / Services</th>
            <th className={`text-left ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>HSN/SAC</th>
            <th className={`text-right ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>Qty</th>
            <th className={`text-right ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>Rate</th>
            <th className={`text-center ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>GST%</th>
            <th className={`text-right ${cellPad} text-xs font-medium uppercase`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item: any, i: number) => (
            <tr key={item.id} className={bordered ? "border-b border-slate-300" : "border-b"}>
              <td className={`${cellPad} text-slate-400 ${bordered ? "border-r border-slate-300" : ""}`}>{i + 1}</td>
              <td className={`${cellPad} font-medium ${bordered ? "border-r border-slate-300" : ""}`}>
                {item.name}
                <span className={`ml-1 px-1 rounded text-[9px] ${item.gstType === "inclusive" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                  {item.gstType === "inclusive" ? "INCL" : "EXCL"}
                </span>
              </td>
              <td className={`${cellPad} text-slate-500 ${bordered ? "border-r border-slate-300" : ""}`}>{item.hsn || "—"}</td>
              <td className={`${cellPad} text-right tabular-nums ${bordered ? "border-r border-slate-300" : ""}`}>{item.qty}</td>
              <td className={`${cellPad} text-right tabular-nums ${bordered ? "border-r border-slate-300" : ""}`}>{formatINR(item.rate)}</td>
              <td className={`${cellPad} text-center text-xs ${bordered ? "border-r border-slate-300" : ""}`}>{item.gstRate}%</td>
              <td className={`${cellPad} text-right font-medium tabular-nums`}>{formatINR(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TotalsBlock({ invoice, accentColor, compact }: { invoice: any; accentColor: string; compact?: boolean }) {
  const textSize = compact ? "text-xs" : "text-sm"
  const labelClass = compact ? "text-[10px] text-slate-500" : "text-xs text-slate-500"
  const isInter = invoice.supplyType === "inter"
  const gstRate = invoice.items?.[0]?.gstRate || 0
  const halfRate = (gstRate / 2).toFixed(2).replace(/\.00$/, "")
  return (
    <div className="flex justify-end mb-3">
      <div className={`w-full sm:w-72 space-y-1.5 ${textSize}`}>
        <div className="flex justify-between"><span className={labelClass}>Subtotal</span><span className="tabular-nums">{formatINR(invoice.subtotal)}</span></div>
        {invoice.discountAmount > 0 && (
          <div className="flex justify-between"><span className={labelClass}>Discount ({invoice.discountPct}%)</span><span className="text-destructive tabular-nums">− {formatINR(invoice.discountAmount)}</span></div>
        )}
        <div className="flex justify-between"><span className={labelClass}>Taxable Amount</span><span className="tabular-nums">{formatINR(invoice.taxableAmount)}</span></div>
        {isInter ? (
          <div className="flex justify-between"><span className={labelClass}>IGST {gstRate}%</span><span className="tabular-nums">{formatINR(invoice.igst)}</span></div>
        ) : (
          <>
            <div className="flex justify-between"><span className={labelClass}>CGST {halfRate}%</span><span className="tabular-nums">{formatINR(invoice.cgst)}</span></div>
            <div className="flex justify-between"><span className={labelClass}>SGST {halfRate}%</span><span className="tabular-nums">{formatINR(invoice.sgst)}</span></div>
          </>
        )}
        <Separator className="my-1" />
        <div className={`flex justify-between ${compact ? "text-sm" : "text-base"} font-bold`}>
          <span>Total</span>
          <span className={`${accentColor} tabular-nums`}>{formatINR(invoice.grandTotal)}</span>
        </div>
        {invoice.paidAmount > 0 && (
          <>
            <div className="flex justify-between text-xs"><span className="text-green-600">Paid</span><span className="tabular-nums text-green-600">− {formatINR(invoice.paidAmount)}</span></div>
            <div className="flex justify-between font-semibold"><span>Balance Due</span><span className="text-destructive tabular-nums">{formatINR(invoice.balanceDue)}</span></div>
          </>
        )}
      </div>
    </div>
  )
}

function AmountInWords({ invoice, compact }: { invoice: any; compact?: boolean }) {
  return (
    <div className={`mb-4 p-2 bg-muted/30 rounded ${compact ? "text-[10px]" : "text-xs"}`}>
      <span className="font-semibold">Total Amount (in words): </span>
      <span className="text-slate-600">{numberToWords(invoice.grandTotal)}</span>
    </div>
  )
}

function HsnSummaryTable({ invoice, isInter, compact }: { invoice: any; isInter: boolean; compact?: boolean }) {
  const summary = getHsnSummary(invoice)
  const cellPad = compact ? "p-1" : "p-2"
  return (
    <div className="mb-4">
      <p className={`font-semibold text-slate-500 uppercase mb-1 ${compact ? "text-[9px]" : "text-xs"}`}>HSN/SAC Summary</p>
      <table className="w-full text-xs border">
        <thead className="bg-muted/30">
          <tr>
            <th className={`text-left ${cellPad} border-b font-medium uppercase`}>HSN/SAC</th>
            <th className={`text-right ${cellPad} border-b font-medium uppercase`}>Taxable</th>
            <th className={`text-center ${cellPad} border-b font-medium uppercase`} colSpan={isInter ? 1 : 2}>CGST</th>
            {!isInter && <th className={`text-center ${cellPad} border-b font-medium uppercase`} colSpan={2}>SGST</th>}
            {isInter && <th className={`text-center ${cellPad} border-b font-medium uppercase`} colSpan={2}>IGST</th>}
            <th className={`text-right ${cellPad} border-b font-medium uppercase`}>Total Tax</th>
          </tr>
          <tr className="bg-muted/20">
            <th className={`${cellPad} border-b`}></th>
            <th className={`${cellPad} border-b`}></th>
            <th className={`text-center ${cellPad} border-b text-[9px]`}>Rate</th>
            <th className={`text-right ${cellPad} border-b text-[9px]`}>Amt</th>
            {!isInter && <th className={`text-center ${cellPad} border-b text-[9px]`}>Rate</th>}
            {!isInter && <th className={`text-right ${cellPad} border-b text-[9px]`}>Amt</th>}
            {isInter && <th className={`text-center ${cellPad} border-b text-[9px]`}>Rate</th>}
            {isInter && <th className={`text-right ${cellPad} border-b text-[9px]`}>Amt</th>}
            <th className={`${cellPad} border-b`}></th>
          </tr>
        </thead>
        <tbody>
          {summary.map((s, i) => (
            <tr key={i} className="border-b">
              <td className={`${cellPad} font-medium`}>{s.hsn}</td>
              <td className={`${cellPad} text-right tabular-nums`}>{formatINR(s.taxable)}</td>
              {isInter ? (
                <>
                  <td className={`${cellPad} text-center`}>{s.rate}%</td>
                  <td className={`${cellPad} text-right tabular-nums`}>{formatINR(s.igst)}</td>
                </>
              ) : (
                <>
                  <td className={`${cellPad} text-center`}>{(s.rate / 2)}%</td>
                  <td className={`${cellPad} text-right tabular-nums`}>{formatINR(s.cgst)}</td>
                  <td className={`${cellPad} text-center`}>{(s.rate / 2)}%</td>
                  <td className={`${cellPad} text-right tabular-nums`}>{formatINR(s.sgst)}</td>
                </>
              )}
              <td className={`${cellPad} text-right tabular-nums font-medium`}>{formatINR(s.totalTax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NotesTermsSignature({ invoice, tenant, compact }: { invoice: any; tenant: any; compact?: boolean }) {
  const showSection = invoice.notes || invoice.terms
  if (!showSection && !tenant?.signature) return null
  return (
    <>
      {showSection && <Separator className="my-3" />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {invoice.terms && (
          <div>
            <p className={`font-semibold text-slate-400 uppercase mb-1 ${compact ? "text-[9px]" : "text-xs"}`}>Terms & Conditions</p>
            <p className={`text-slate-500 whitespace-pre-wrap ${compact ? "text-[10px]" : "text-xs"}`}>{invoice.terms}</p>
          </div>
        )}
        {invoice.notes && (
          <div>
            <p className={`font-semibold text-slate-400 uppercase mb-1 ${compact ? "text-[9px]" : "text-xs"}`}>Notes</p>
            <p className={`text-slate-500 whitespace-pre-wrap ${compact ? "text-[10px]" : "text-xs"}`}>{invoice.notes}</p>
          </div>
        )}
      </div>
      {tenant?.signature && (
        <div className="mt-6 flex justify-end">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-2">For {tenant.businessName}</p>
            <img src={`/api/tenant/file?name=${tenant.signature}`} alt="signature" className="h-16 object-contain" />
            <p className="text-xs text-slate-500 mt-1">Authorised Signatory</p>
          </div>
        </div>
      )}
    </>
  )
}

function BankDetails({ tenant, variant }: { tenant: any; variant: string }) {
  const variants: Record<string, string> = {
    modern: "bg-teal-50 border-teal-200",
    classic: "border-2 border-slate-800",
    professional: "bg-slate-50 rounded",
    compact: "bg-muted/30",
    colorful: "bg-purple-50 rounded-lg",
  }
  return (
    <div className={`mt-3 p-3 border ${variants[variant] || ""}`}>
      <p className="text-xs font-semibold uppercase mb-2">Bank Details</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {tenant.bankName && <div><span className="text-slate-500">Bank:</span> <span className="font-medium">{tenant.bankName}</span></div>}
        {tenant.bankAccountName && <div><span className="text-slate-500">A/C Name:</span> <span className="font-medium">{tenant.bankAccountName}</span></div>}
        {tenant.bankAccountNumber && <div><span className="text-slate-500">A/C No:</span> <span className="font-medium">{tenant.bankAccountNumber}</span></div>}
        {tenant.bankIfsc && <div><span className="text-slate-500">IFSC:</span> <span className="font-medium">{tenant.bankIfsc}</span></div>}
        {tenant.bankBranch && <div><span className="text-slate-500">Branch:</span> <span className="font-medium">{tenant.bankBranch}</span></div>}
        {tenant.bankUpi && <div><span className="text-slate-500">UPI:</span> <span className="font-medium">{tenant.bankUpi}</span></div>}
      </div>
    </div>
  )
}

// ============ Main router ============
export function InvoiceTemplate({ invoice, tenant, party, template }: TemplateProps & { template: string }) {
  const props = { invoice, tenant, party }
  switch (template) {
    case "classic":
      return <ClassicTemplate {...props} />
    case "professional":
      return <ProfessionalTemplate {...props} />
    case "compact":
      return <CompactTemplate {...props} />
    case "colorful":
      return <ColorfulTemplate {...props} />
    case "modern":
    default:
      return <ModernTemplate {...props} />
  }
}

export const INVOICE_TEMPLATES = [
  { id: "modern", name: "Modern", description: "Clean, minimal design with teal accent" },
  { id: "classic", name: "Classic", description: "Traditional bordered, formal layout" },
  { id: "professional", name: "Professional", description: "Corporate dark header, sidebar details" },
  { id: "compact", name: "Compact", description: "Dense, smaller — saves paper" },
  { id: "colorful", name: "Colorful", description: "Purple-pink gradient accents" },
] as const
