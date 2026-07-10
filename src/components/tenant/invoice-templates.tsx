"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatINR, formatDate } from "@/lib/format"

interface TemplateProps {
  invoice: any
  tenant: any
  party: any
}

// Common GST rate label helper
function gstLabel(rate: number, isInter: boolean): string {
  const halfRate = (rate / 2).toFixed(2).replace(/\.00$/, "")
  if (isInter) return `IGST ${rate}%`
  return `CGST ${halfRate}% + SGST ${halfRate}%`
}

// ============ TEMPLATE 1: MODERN (clean, minimal) ============
function ModernTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  return (
    <div className="p-6 sm:p-8 bg-white text-slate-900">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3">
          {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-16 h-16 object-contain" />}
          <div>
            <h2 className="text-xl font-bold">{tenant?.businessName}</h2>
            {tenant?.legalName && tenant.legalName !== tenant.businessName && <p className="text-xs text-slate-500">{tenant.legalName}</p>}
            <p className="text-xs text-slate-500 mt-1">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
            <p className="text-xs text-slate-500">{tenant?.phone && `📞 ${tenant.phone}`}{tenant?.email && ` · ✉ ${tenant.email}`}</p>
            {tenant?.gstin && <p className="text-xs text-slate-500">GSTIN: {tenant.gstin}</p>}
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-2xl font-bold uppercase text-teal-600">{invoice.type === "estimate" ? "Estimate" : "Tax Invoice"}</h3>
          <p className="text-sm font-semibold mt-1">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate-500">Date: {formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>
      <Separator className="my-4 bg-teal-600 h-0.5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Bill To</p>
          <p className="font-semibold">{party?.name}</p>
          {party?.address && <p className="text-xs text-slate-500">{party.address}</p>}
          <p className="text-xs text-slate-500">{party?.city}{party?.state ? `, ${party.state}` : ""}</p>
          {party?.phone && <p className="text-xs text-slate-500">📞 {party.phone}</p>}
          {party?.gstin && <p className="text-xs text-slate-500">GSTIN: {party.gstin}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Supply Type</p>
          <p className="text-sm">{isInter ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
        </div>
      </div>
      <ItemsTable invoice={invoice} isInter={isInter} />
      <TotalsBlock invoice={invoice} accentColor="text-teal-600" />
      <NotesTermsSignature invoice={invoice} tenant={tenant} />
      {tenant?.bankName && <BankDetails tenant={tenant} variant="modern" />}
    </div>
  )
}

// ============ TEMPLATE 2: CLASSIC (traditional bordered) ============
function ClassicTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  return (
    <div className="p-6 sm:p-8 bg-white text-slate-900 border-2 border-slate-800">
      <div className="text-center mb-6 pb-4 border-b-2 border-slate-800">
        {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-20 h-20 object-contain mx-auto mb-2" />}
        <h2 className="text-2xl font-bold uppercase tracking-wide">{tenant?.businessName}</h2>
        {tenant?.legalName && tenant.legalName !== tenant.businessName && <p className="text-xs text-slate-600">{tenant.legalName}</p>}
        <p className="text-xs text-slate-600 mt-1">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
        <p className="text-xs text-slate-600">{tenant?.phone && `📞 ${tenant.phone}`}{tenant?.email && ` · ✉ ${tenant.email}`}</p>
        {tenant?.gstin && <p className="text-xs font-semibold text-slate-700">GSTIN: {tenant.gstin}</p>}
      </div>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold uppercase border-2 border-slate-800 inline-block px-8 py-1">{invoice.type === "estimate" ? "Estimate" : "Tax Invoice"}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 border border-slate-300 p-3">
        <div>
          <p className="text-xs font-bold uppercase mb-1">Bill To:</p>
          <p className="font-semibold">{party?.name}</p>
          {party?.address && <p className="text-xs text-slate-600">{party.address}</p>}
          <p className="text-xs text-slate-600">{party?.city}{party?.state ? `, ${party.state}` : ""}</p>
          {party?.gstin && <p className="text-xs text-slate-600">GSTIN: {party.gstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs"><span className="font-bold">No:</span> {invoice.invoiceNumber}</p>
          <p className="text-xs"><span className="font-bold">Date:</span> {formatDate(invoice.invoiceDate)}</p>
          <p className="text-xs"><span className="font-bold">Supply:</span> {isInter ? "IGST" : "CGST+SGST"}</p>
        </div>
      </div>
      <ItemsTable invoice={invoice} isInter={isInter} bordered />
      <TotalsBlock invoice={invoice} accentColor="text-slate-900" />
      <NotesTermsSignature invoice={invoice} tenant={tenant} />
      {tenant?.bankName && <BankDetails tenant={tenant} variant="classic" />}
    </div>
  )
}

// ============ TEMPLATE 3: PROFESSIONAL (corporate, sidebar) ============
function ProfessionalTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  return (
    <div className="bg-white text-slate-900">
      <div className="bg-slate-800 text-white p-6 sm:p-8 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-16 h-16 object-contain bg-white p-1 rounded" />}
          <div>
            <h2 className="text-xl font-bold">{tenant?.businessName}</h2>
            {tenant?.legalName && tenant.legalName !== tenant.businessName && <p className="text-xs text-slate-300">{tenant.legalName}</p>}
            <p className="text-xs text-slate-300 mt-1">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
            <p className="text-xs text-slate-300">{tenant?.phone && `📞 ${tenant.phone}`}{tenant?.email && ` · ✉ ${tenant.email}`}</p>
            {tenant?.gstin && <p className="text-xs text-slate-300">GSTIN: {tenant.gstin}</p>}
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-2xl font-bold uppercase">{invoice.type === "estimate" ? "Estimate" : "Tax Invoice"}</h3>
          <p className="text-sm font-semibold mt-1">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate-300">Date: {formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Bill To</p>
            <p className="font-semibold">{party?.name}</p>
            {party?.address && <p className="text-xs text-slate-500">{party.address}</p>}
            <p className="text-xs text-slate-500">{party?.city}{party?.state ? `, ${party.state}` : ""}</p>
            {party?.phone && <p className="text-xs text-slate-500">📞 {party.phone}</p>}
            {party?.gstin && <p className="text-xs text-slate-500">GSTIN: {party.gstin}</p>}
          </div>
          <div className="bg-slate-50 p-3 rounded">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Details</p>
            <p className="text-xs"><span className="font-semibold">Supply:</span> {isInter ? "Inter-state (IGST)" : "Intra-state"}</p>
            <p className="text-xs"><span className="font-semibold">Status:</span> <span className="capitalize">{invoice.status}</span></p>
          </div>
        </div>
        <ItemsTable invoice={invoice} isInter={isInter} />
        <TotalsBlock invoice={invoice} accentColor="text-slate-800" />
        <NotesTermsSignature invoice={invoice} tenant={tenant} />
        {tenant?.bankName && <BankDetails tenant={tenant} variant="professional" />}
      </div>
    </div>
  )
}

// ============ TEMPLATE 4: COMPACT (smaller, dense) ============
function CompactTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  return (
    <div className="p-4 sm:p-6 bg-white text-slate-900 text-xs">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2">
          {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-12 h-12 object-contain" />}
          <div>
            <h2 className="text-base font-bold">{tenant?.businessName}</h2>
            <p className="text-[10px] text-slate-500">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
            <p className="text-[10px] text-slate-500">{tenant?.phone}{tenant?.email && ` · ${tenant.email}`}</p>
            {tenant?.gstin && <p className="text-[10px] text-slate-500">GSTIN: {tenant.gstin}</p>}
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-lg font-bold uppercase text-primary">{invoice.type === "estimate" ? "Estimate" : "Invoice"}</h3>
          <p className="text-[10px] font-semibold">{invoice.invoiceNumber}</p>
          <p className="text-[10px] text-slate-500">{formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4 text-[10px]">
        <div>
          <span className="font-semibold">Bill To:</span> {party?.name}
          {party?.gstin && ` · ${party.gstin}`}
          {party?.phone && ` · ${party.phone}`}
        </div>
        <div className="text-right">
          <span className="font-semibold">Supply:</span> {isInter ? "IGST" : "CGST+SGST"}
        </div>
      </div>
      <ItemsTable invoice={invoice} isInter={isInter} compact />
      <TotalsBlock invoice={invoice} accentColor="text-primary" compact />
      <NotesTermsSignature invoice={invoice} tenant={tenant} compact />
      {tenant?.bankName && <BankDetails tenant={tenant} variant="compact" />}
    </div>
  )
}

// ============ TEMPLATE 5: COLORFUL (accent borders) ============
function ColorfulTemplate({ invoice, tenant, party }: TemplateProps) {
  const isInter = invoice.supplyType === "inter"
  return (
    <div className="bg-white text-slate-900">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2" />
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            {tenant?.logo && <img src={`/api/tenant/file?name=${tenant.logo}`} alt="logo" className="w-16 h-16 object-contain rounded-lg p-1 bg-purple-50" />}
            <div>
              <h2 className="text-xl font-bold text-purple-700">{tenant?.businessName}</h2>
              {tenant?.legalName && tenant.legalName !== tenant.businessName && <p className="text-xs text-slate-500">{tenant.legalName}</p>}
              <p className="text-xs text-slate-500 mt-1">{tenant?.address}{tenant?.city ? `, ${tenant.city}` : ""}{tenant?.state ? `, ${tenant.state}` : ""}</p>
              <p className="text-xs text-slate-500">{tenant?.phone && `📞 ${tenant.phone}`}{tenant?.email && ` · ✉ ${tenant.email}`}</p>
              {tenant?.gstin && <p className="text-xs text-slate-500">GSTIN: {tenant.gstin}</p>}
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-2xl font-bold uppercase text-pink-600">{invoice.type === "estimate" ? "Estimate" : "Tax Invoice"}</h3>
            <p className="text-sm font-semibold mt-1">{invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-500">Date: {formatDate(invoice.invoiceDate)}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 capitalize">{invoice.status}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-purple-50 p-3 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Bill To</p>
            <p className="font-semibold">{party?.name}</p>
            {party?.address && <p className="text-xs text-slate-500">{party.address}</p>}
            <p className="text-xs text-slate-500">{party?.city}{party?.state ? `, ${party.state}` : ""}</p>
            {party?.phone && <p className="text-xs text-slate-500">📞 {party.phone}</p>}
            {party?.gstin && <p className="text-xs text-slate-500">GSTIN: {party.gstin}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Supply Type</p>
            <p className="text-sm">{isInter ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
          </div>
        </div>
        <ItemsTable invoice={invoice} isInter={isInter} />
        <TotalsBlock invoice={invoice} accentColor="text-purple-700" />
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
    <div className="overflow-x-auto mb-6">
      <table className={`w-full text-sm ${bordered ? "border border-slate-300" : ""}`}>
        <thead className="bg-muted/30">
          <tr className={bordered ? "border-b border-slate-300" : "border-b"}>
            <th className={`text-left ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>#</th>
            <th className={`text-left ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>Item</th>
            <th className={`text-left ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>HSN</th>
            <th className={`text-right ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>Qty</th>
            <th className={`text-right ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>Rate</th>
            <th className={`text-center ${cellPad} text-xs font-medium uppercase ${bordered ? "border-r border-slate-300" : ""}`}>GST</th>
            <th className={`text-right ${cellPad} text-xs font-medium uppercase`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item: any, i: number) => (
            <tr key={item.id} className={bordered ? "border-b border-slate-300" : "border-b"}>
              <td className={`${cellPad} text-slate-400 ${bordered ? "border-r border-slate-300" : ""}`}>{i + 1}</td>
              <td className={`${cellPad} font-medium ${bordered ? "border-r border-slate-300" : ""}`}>{item.name}</td>
              <td className={`${cellPad} text-slate-500 ${bordered ? "border-r border-slate-300" : ""}`}>{item.hsn || "—"}</td>
              <td className={`${cellPad} text-right tabular-nums ${bordered ? "border-r border-slate-300" : ""}`}>{item.qty}</td>
              <td className={`${cellPad} text-right tabular-nums ${bordered ? "border-r border-slate-300" : ""}`}>{formatINR(item.rate)}</td>
              <td className={`${cellPad} text-center text-xs ${bordered ? "border-r border-slate-300" : ""}`}>
                {gstLabel(item.gstRate, isInter)}
                <span className={`ml-1 px-1 rounded text-[9px] ${item.gstType === "inclusive" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                  {item.gstType === "inclusive" ? "INCL" : "EXCL"}
                </span>
              </td>
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
  return (
    <div className="flex justify-end mb-6">
      <div className={`w-full sm:w-72 space-y-1.5 ${textSize}`}>
        <div className="flex justify-between"><span className={labelClass}>Subtotal</span><span className="tabular-nums">{formatINR(invoice.subtotal)}</span></div>
        {invoice.discountAmount > 0 && (
          <div className="flex justify-between"><span className={labelClass}>Discount ({invoice.discountPct}%)</span><span className="text-destructive tabular-nums">− {formatINR(invoice.discountAmount)}</span></div>
        )}
        <div className="flex justify-between"><span className={labelClass}>Taxable Amount</span><span className="tabular-nums">{formatINR(invoice.taxableAmount)}</span></div>
        {invoice.supplyType === "intra" ? (
          <>
            <div className="flex justify-between"><span className={labelClass}>CGST</span><span className="tabular-nums">{formatINR(invoice.cgst)}</span></div>
            <div className="flex justify-between"><span className={labelClass}>SGST</span><span className="tabular-nums">{formatINR(invoice.sgst)}</span></div>
          </>
        ) : (
          <div className="flex justify-between"><span className={labelClass}>IGST</span><span className="tabular-nums">{formatINR(invoice.igst)}</span></div>
        )}
        <Separator className="my-2" />
        <div className={`flex justify-between ${compact ? "text-sm" : "text-base"} font-bold`}>
          <span>Grand Total</span>
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

function NotesTermsSignature({ invoice, tenant, compact }: { invoice: any; tenant: any; compact?: boolean }) {
  const showSection = invoice.notes || invoice.terms
  if (!showSection && !tenant?.signature) return null
  return (
    <>
      {showSection && <Separator className="my-4" />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {invoice.notes && (
          <div>
            <p className={`font-semibold text-slate-400 uppercase mb-1 ${compact ? "text-[9px]" : "text-xs"}`}>Notes</p>
            <p className={`text-slate-500 whitespace-pre-wrap ${compact ? "text-[10px]" : "text-xs"}`}>{invoice.notes}</p>
          </div>
        )}
        {invoice.terms && (
          <div>
            <p className={`font-semibold text-slate-400 uppercase mb-1 ${compact ? "text-[9px]" : "text-xs"}`}>Terms & Conditions</p>
            <p className={`text-slate-500 whitespace-pre-wrap ${compact ? "text-[10px]" : "text-xs"}`}>{invoice.terms}</p>
          </div>
        )}
      </div>
      {tenant?.signature && (
        <div className="mt-8 flex justify-end">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-2">For {tenant.businessName}</p>
            <img src={`/api/tenant/file?name=${tenant.signature}`} alt="signature" className="h-16 object-contain" />
            <p className="text-xs text-slate-500 mt-1">Authorized Signatory</p>
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
    <div className={`mt-4 p-3 border ${variants[variant] || ""}`}>
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
