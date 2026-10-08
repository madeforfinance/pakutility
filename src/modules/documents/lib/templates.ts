/* Document template definitions — 15 professional letter templates for Pakistan. */
import { fmtDate } from '../../../lib/format';

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'textarea';
  def?: string;
  placeholder?: string;
}

export interface DocTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  legal?: boolean;
  fields: TemplateField[];
  body: (v: Record<string, string>) => string;
}

const d = (iso?: string) => fmtDate(iso) || '__________';
const t = (s?: string) => (s && s.trim() ? s.trim() : '__________');

/* ---------- amount in words (Pakistani numbering: arab / crore / lakh) ---------- */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function under100(n: number): string {
  if (n < 20) return ONES[n];
  const ten = TENS[Math.floor(n / 10)];
  const one = ONES[n % 10];
  return one ? `${ten} ${one}` : ten;
}
function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (r) parts.push(under100(r));
  return parts.join(' ');
}

export function amountInWords(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (!Number.isFinite(n) || n === 0) return 'Zero Rupees Only';
  if (n >= 1e12) return `${n.toLocaleString('en-PK')} Rupees Only`;
  const arab = Math.floor(n / 1e9);
  const crore = Math.floor((n % 1e9) / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  const parts: string[] = [];
  if (arab) parts.push(`${under1000(arab)} Arab`);
  if (crore) parts.push(`${under100(crore)} Crore`);
  if (lakh) parts.push(`${under100(lakh)} Lakh`);
  if (thousand) parts.push(`${under100(thousand)} Thousand`);
  if (rest) parts.push(under1000(rest));
  return `${parts.join(' ')} Rupees Only`;
}

export const TEMPLATES: DocTemplate[] = [
  {
    id: 'leave-app',
    title: 'Leave Application',
    description: 'Formal leave request to your manager or HR department.',
    icon: 'CalendarClock',
    fields: [
      { key: 'recipient', label: 'Addressed to', type: 'text', def: 'The Manager' },
      { key: 'organization', label: 'Organization', type: 'text', placeholder: 'Company / school name' },
      { key: 'applicantName', label: 'Your name', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'leaveType', label: 'Leave type', type: 'text', def: 'annual' },
      { key: 'fromDate', label: 'From date', type: 'date' },
      { key: 'toDate', label: 'To date', type: 'date' },
      { key: 'totalDays', label: 'Total days', type: 'text', placeholder: 'e.g. 3' },
      { key: 'reason', label: 'Reason', type: 'textarea', placeholder: 'Brief reason for leave' },
      { key: 'date', label: 'Application date', type: 'date' },
    ],
    body: (v) =>
      `To,\n${t(v.recipient)}\n${t(v.organization)}\n\nDate: ${d(v.date)}\n\nSubject: Application for ${t(v.leaveType)} leave\n\nRespected Sir/Madam,\n\nI, ${t(v.applicantName)}, working as ${t(v.designation)}, respectfully request ${t(v.leaveType)} leave from ${d(v.fromDate)} to ${d(v.toDate)} (${t(v.totalDays)} days) for the following reason:\n\n${t(v.reason)}\n\nI will ensure my pending work is completed or properly handed over before proceeding on leave. Kindly grant me leave for the above-mentioned period.\n\nThanking you.\n\nYours faithfully,\n${t(v.applicantName)}\n${t(v.designation)}`,
  },
  {
    id: 'job-app',
    title: 'Job Application',
    description: 'Apply for a advertised or speculative position.',
    icon: 'Briefcase',
    fields: [
      { key: 'applicantName', label: 'Your name', type: 'text' },
      { key: 'address', label: 'Your address', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'position', label: 'Position applied for', type: 'text' },
      { key: 'companyName', label: 'Company name', type: 'text' },
      { key: 'education', label: 'Education', type: 'text', placeholder: 'e.g. BBA, University of the Punjab' },
      { key: 'experience', label: 'Experience', type: 'text', placeholder: 'e.g. 2 years in accounts' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: (v) =>
      `${t(v.applicantName)}\n${t(v.address)}\nPhone: ${t(v.phone)} | Email: ${t(v.email)}\n\nDate: ${d(v.date)}\n\nThe HR Manager\n${t(v.companyName)}\n\nSubject: Application for the position of ${t(v.position)}\n\nRespected Sir/Madam,\n\nI am writing to apply for the position of ${t(v.position)} at ${t(v.companyName)}. I hold ${t(v.education)} and have ${t(v.experience)} of relevant experience.\n\nI am confident that my qualifications and dedication make me a strong candidate for this role. I would welcome the opportunity to discuss how I can contribute to your organization in an interview.\n\nMy resume is attached for your kind review.\n\nThanking you.\n\nYours sincerely,\n${t(v.applicantName)}`,
  },
  {
    id: 'cover-letter',
    title: 'Cover Letter',
    description: 'A polished cover letter to accompany your resume.',
    icon: 'NotebookPen',
    fields: [
      { key: 'applicantName', label: 'Your name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'position', label: 'Position', type: 'text' },
      { key: 'companyName', label: 'Company', type: 'text' },
      { key: 'highlights', label: 'Key strengths (one per line)', type: 'textarea', placeholder: 'What makes you a great fit' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: (v) => {
      const points = (v.highlights || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `- ${s}`)
        .join('\n');
      return `${t(v.applicantName)}\nPhone: ${t(v.phone)} | Email: ${t(v.email)}\n\nDate: ${d(v.date)}\n\nHiring Manager\n${t(v.companyName)}\n\nSubject: Cover letter — ${t(v.position)}\n\nDear Hiring Manager,\n\nI am excited to apply for the ${t(v.position)} role at ${t(v.companyName)}. A few highlights from my background:\n\n${points || '- __________'}\n\nI would be delighted to discuss how my skills align with your team's goals. Thank you for your time and consideration.\n\nWarm regards,\n${t(v.applicantName)}`;
    },
  },
  {
    id: 'business-letter',
    title: 'Business Letter',
    description: 'General-purpose formal business correspondence.',
    icon: 'Building2',
    fields: [
      { key: 'senderName', label: 'Your name', type: 'text' },
      { key: 'senderOrg', label: 'Your organization', type: 'text' },
      { key: 'recipientName', label: 'Recipient name', type: 'text' },
      { key: 'recipientOrg', label: 'Recipient organization', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'subject', label: 'Subject', type: 'text' },
      { key: 'body', label: 'Letter body', type: 'textarea', placeholder: 'Write the main content of your letter' },
    ],
    body: (v) =>
      `${t(v.senderName)}\n${t(v.senderOrg)}\n\nDate: ${d(v.date)}\n\n${t(v.recipientName)}\n${t(v.recipientOrg)}\n\nSubject: ${t(v.subject)}\n\nDear ${t(v.recipientName)},\n\n${t(v.body)}\n\nYours truly,\n${t(v.senderName)}\n${t(v.senderOrg)}`,
  },
  {
    id: 'complaint-letter',
    title: 'Complaint Letter',
    description: 'Lodge a formal complaint with a company or authority.',
    icon: 'FileWarning',
    fields: [
      { key: 'name', label: 'Your name', type: 'text' },
      { key: 'address', label: 'Your address', type: 'text' },
      { key: 'recipientName', label: 'Addressed to', type: 'text', def: 'The Customer Service Manager' },
      { key: 'recipientOrg', label: 'Organization', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. Faulty product / poor service' },
      { key: 'details', label: 'Complaint details', type: 'textarea', placeholder: 'Dates, reference numbers, what happened' },
      { key: 'resolution', label: 'Desired resolution', type: 'textarea', placeholder: 'Refund, replacement, fix…' },
    ],
    body: (v) =>
      `${t(v.name)}\n${t(v.address)}\n\nDate: ${d(v.date)}\n\n${t(v.recipientName)}\n${t(v.recipientOrg)}\n\nSubject: ${t(v.subject)}\n\nRespected Sir/Madam,\n\nI am writing to formally register a complaint regarding the following matter:\n\n${t(v.details)}\n\nI would appreciate the following resolution:\n\n${t(v.resolution)}\n\nI trust this matter will be resolved promptly. I can be contacted at the address above for any further information.\n\nYours faithfully,\n${t(v.name)}`,
  },
  {
    id: 'authorization-letter',
    title: 'Authorization Letter',
    description: 'Authorize someone to act on your behalf.',
    icon: 'UserCheck',
    fields: [
      { key: 'authorizerName', label: 'Your name (authorizer)', type: 'text' },
      { key: 'authorizerCnic', label: 'Your CNIC', type: 'text', placeholder: '35202-1234567-1' },
      { key: 'authorizedName', label: 'Authorized person name', type: 'text' },
      { key: 'authorizedCnic', label: 'Authorized person CNIC', type: 'text' },
      { key: 'purpose', label: 'Purpose', type: 'textarea', placeholder: 'What are they authorized to do?' },
      { key: 'validFrom', label: 'Valid from', type: 'date' },
      { key: 'validUntil', label: 'Valid until', type: 'date' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: (v) =>
      `AUTHORIZATION LETTER\n\nDate: ${d(v.date)}\n\nI, ${t(v.authorizerName)} (CNIC: ${t(v.authorizerCnic)}), hereby authorize ${t(v.authorizedName)} (CNIC: ${t(v.authorizedCnic)}) to act on my behalf for the following purpose:\n\n${t(v.purpose)}\n\nThis authorization is valid from ${d(v.validFrom)} to ${d(v.validUntil)}.\n\nAuthorized by:\n\n____________________\n${t(v.authorizerName)}\nCNIC: ${t(v.authorizerCnic)}`,
  },
  {
    id: 'undertaking',
    title: 'Undertaking',
    description: 'A formal written commitment or declaration.',
    icon: 'ScrollText',
    legal: true,
    fields: [
      { key: 'name', label: 'Your name', type: 'text' },
      { key: 'cnic', label: 'CNIC', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'undertakingText', label: 'Undertaking statement', type: 'textarea', placeholder: 'I hereby undertake that…' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: (v) =>
      `UNDERTAKING\n\nI, ${t(v.name)} (CNIC: ${t(v.cnic)}), resident of ${t(v.address)}, do hereby solemnly undertake as follows:\n\n${t(v.undertakingText)}\n\nI confirm that the above statement is true to the best of my knowledge, and I shall be bound by this undertaking.\n\nDate: ${d(v.date)}\n\n____________________\n${t(v.name)}\nCNIC: ${t(v.cnic)}`,
  },
  {
    id: 'payment-reminder',
    title: 'Payment Reminder',
    description: 'Remind a customer about an overdue invoice politely.',
    icon: 'Bell',
    fields: [
      { key: 'senderName', label: 'Your name', type: 'text' },
      { key: 'senderOrg', label: 'Your business', type: 'text' },
      { key: 'customerName', label: 'Customer name', type: 'text' },
      { key: 'invoiceNo', label: 'Invoice number', type: 'text' },
      { key: 'amount', label: 'Amount due (Rs.)', type: 'text' },
      { key: 'dueDate', label: 'Due date', type: 'date' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: (v) =>
      `${t(v.senderName)}\n${t(v.senderOrg)}\n\nDate: ${d(v.date)}\n\n${t(v.customerName)}\n\nSubject: Friendly reminder — payment due for Invoice ${t(v.invoiceNo)}\n\nDear ${t(v.customerName)},\n\nThis is a friendly reminder that payment of Rs. ${t(v.amount)} for Invoice No. ${t(v.invoiceNo)} was due on ${d(v.dueDate)}.\n\nWe would appreciate it if you could arrange payment at your earliest convenience. If you have already made the payment, please disregard this reminder.\n\nThank you for your business.\n\nWarm regards,\n${t(v.senderName)}\n${t(v.senderOrg)}`,
  },
  {
    id: 'rent-receipt',
    title: 'Rent Receipt',
    description: 'Acknowledge monthly rent received from a tenant.',
    icon: 'Receipt',
    fields: [
      { key: 'landlordName', label: 'Landlord name', type: 'text' },
      { key: 'tenantName', label: 'Tenant name', type: 'text' },
      { key: 'propertyAddress', label: 'Property address', type: 'text' },
      { key: 'amount', label: 'Amount received (Rs.)', type: 'text' },
      { key: 'rentMonth', label: 'Rent month', type: 'text', placeholder: 'e.g. October 2026' },
      { key: 'paymentMethod', label: 'Payment method', type: 'text', def: 'Cash' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: (v) => {
      const amt = parseFloat((v.amount || '').replace(/,/g, '')) || 0;
      return `RENT RECEIPT\n\nDate: ${d(v.date)}\n\nReceived from ${t(v.tenantName)} a sum of Rs. ${amt ? amt.toLocaleString('en-PK') : '__________'} (${amountInWords(amt)}) as monthly rent for the property located at ${t(v.propertyAddress)}, for the month of ${t(v.rentMonth)}.\n\nPayment method: ${t(v.paymentMethod)}\n\n____________________\n${t(v.landlordName)} (Landlord)`;
    },
  },
  {
    id: 'experience-certificate',
    title: 'Experience Certificate',
    description: 'Certify an employee’s work tenure and role.',
    icon: 'Award',
    fields: [
      { key: 'employeeName', label: 'Employee name', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'joinDate', label: 'Joining date', type: 'date' },
      { key: 'endDate', label: 'Last working date', type: 'date' },
      { key: 'companyName', label: 'Company name', type: 'text' },
      { key: 'remarks', label: 'Remarks (optional)', type: 'textarea', placeholder: 'Performance remarks' },
      { key: 'issuerName', label: 'Issued by (name & title)', type: 'text' },
      { key: 'date', label: 'Issue date', type: 'date' },
    ],
    body: (v) =>
      `EXPERIENCE CERTIFICATE\n\nDate: ${d(v.date)}\n\nThis is to certify that ${t(v.employeeName)} worked with ${t(v.companyName)} as ${t(v.designation)} in the ${t(v.department)} department, from ${d(v.joinDate)} to ${d(v.endDate)}.\n\n${v.remarks && v.remarks.trim() ? `Remarks: ${v.remarks.trim()}\n\n` : ''}During the tenure, the employee was found to be hardworking and professional in conduct. We wish them success in their future endeavors.\n\nIssued by:\n\n____________________\n${t(v.issuerName)}\n${t(v.companyName)}`,
  },
  {
    id: 'salary-certificate',
    title: 'Salary Certificate',
    description: 'Certify an employee’s monthly salary for official use.',
    icon: 'Banknote',
    fields: [
      { key: 'employeeName', label: 'Employee name', type: 'text' },
      { key: 'cnic', label: 'Employee CNIC', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'monthlySalary', label: 'Monthly salary (Rs.)', type: 'text' },
      { key: 'companyName', label: 'Company name', type: 'text' },
      { key: 'issuerName', label: 'Issued by (name & title)', type: 'text' },
      { key: 'date', label: 'Issue date', type: 'date' },
    ],
    body: (v) => {
      const sal = parseFloat((v.monthlySalary || '').replace(/,/g, '')) || 0;
      return `SALARY CERTIFICATE\n\nDate: ${d(v.date)}\n\nThis is to certify that ${t(v.employeeName)} (CNIC: ${t(v.cnic)}) is employed with ${t(v.companyName)} as ${t(v.designation)}.\n\nThe employee’s gross monthly salary is Rs. ${sal ? sal.toLocaleString('en-PK') : '__________'} (${amountInWords(sal)}).\n\nThis certificate is issued upon the employee’s request for official use.\n\nIssued by:\n\n____________________\n${t(v.issuerName)}\n${t(v.companyName)}`;
    },
  },
  {
    id: 'simple-agreement',
    title: 'Simple Agreement',
    description: 'A basic two-party agreement with custom terms.',
    icon: 'FileCheck',
    legal: true,
    fields: [
      { key: 'agreementTitle', label: 'Agreement title', type: 'text', def: 'Service Agreement' },
      { key: 'partyA', label: 'Party A (name & CNIC)', type: 'text' },
      { key: 'partyB', label: 'Party B (name & CNIC)', type: 'text' },
      { key: 'amount', label: 'Agreement amount (Rs., optional)', type: 'text' },
      { key: 'terms', label: 'Terms & conditions', type: 'textarea', placeholder: 'Write each term on a new line' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: (v) => {
      const terms = (v.terms || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n');
      const amt = parseFloat((v.amount || '').replace(/,/g, '')) || 0;
      return `${t(v.agreementTitle).toUpperCase()}\n\nDate: ${d(v.date)}\n\nThis agreement is made between:\n\nParty A: ${t(v.partyA)}\nParty B: ${t(v.partyB)}\n\n${amt ? `Agreement amount: Rs. ${amt.toLocaleString('en-PK')} (${amountInWords(amt)})\n\n` : ''}Both parties agree to the following terms:\n\n${terms || '1. __________'}\n\nSignatures:\n\n____________________\t\t____________________\nParty A\t\t\t\tParty B`;
    },
  },
  {
    id: 'resignation-letter',
    title: 'Resignation Letter',
    description: 'Resign from your position professionally.',
    icon: 'ClipboardList',
    fields: [
      { key: 'name', label: 'Your name', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'recipientName', label: 'Addressed to', type: 'text', def: 'The Manager' },
      { key: 'organization', label: 'Organization', type: 'text' },
      { key: 'lastWorkingDay', label: 'Last working day', type: 'date' },
      { key: 'reason', label: 'Reason (optional)', type: 'textarea' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    body: (v) =>
      `${t(v.name)}\n${t(v.designation)}, ${t(v.department)}\n\nDate: ${d(v.date)}\n\n${t(v.recipientName)}\n${t(v.organization)}\n\nSubject: Resignation from the position of ${t(v.designation)}\n\nRespected Sir/Madam,\n\nPlease accept this letter as formal notification of my resignation from the position of ${t(v.designation)} at ${t(v.organization)}. My last working day will be ${d(v.lastWorkingDay)}.${v.reason && v.reason.trim() ? `\n\nReason: ${v.reason.trim()}` : ''}\n\nI am grateful for the opportunities for growth and learning during my time here, and I will do my best to ensure a smooth handover of my responsibilities.\n\nThanking you.\n\nYours faithfully,\n${t(v.name)}`,
  },
  {
    id: 'noc',
    title: 'No-Objection Certificate',
    description: 'Issue an NOC for travel, jobs, or other purposes.',
    icon: 'IdCard',
    legal: true,
    fields: [
      { key: 'name', label: 'Person name', type: 'text' },
      { key: 'cnic', label: 'CNIC', type: 'text' },
      { key: 'purpose', label: 'Purpose', type: 'textarea', placeholder: 'e.g. applying for a passport / new job' },
      { key: 'organization', label: 'Issuing organization', type: 'text' },
      { key: 'issuerName', label: 'Issued by (name & title)', type: 'text' },
      { key: 'date', label: 'Issue date', type: 'date' },
    ],
    body: (v) =>
      `NO-OBJECTION CERTIFICATE\n\nDate: ${d(v.date)}\n\nThis is to certify that ${t(v.organization)} has no objection to ${t(v.name)} (CNIC: ${t(v.cnic)}) for the following purpose:\n\n${t(v.purpose)}\n\nThis certificate is issued upon request and is valid for the stated purpose only.\n\nIssued by:\n\n____________________\n${t(v.issuerName)}\n${t(v.organization)}`,
  },
  {
    id: 'general-application',
    title: 'General Application',
    description: 'A flexible application for any request or appeal.',
    icon: 'FileText',
    fields: [
      { key: 'name', label: 'Your name', type: 'text' },
      { key: 'address', label: 'Your address', type: 'text' },
      { key: 'recipientName', label: 'Addressed to', type: 'text' },
      { key: 'organization', label: 'Organization', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'subject', label: 'Subject', type: 'text' },
      { key: 'body', label: 'Application body', type: 'textarea', placeholder: 'Describe your request' },
    ],
    body: (v) =>
      `${t(v.name)}\n${t(v.address)}\n\nDate: ${d(v.date)}\n\n${t(v.recipientName)}\n${t(v.organization)}\n\nSubject: ${t(v.subject)}\n\nRespected Sir/Madam,\n\n${t(v.body)}\n\nI shall be grateful for your kind consideration.\n\nYours faithfully,\n${t(v.name)}`,
  },
];

export function getTemplate(id: string): DocTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
