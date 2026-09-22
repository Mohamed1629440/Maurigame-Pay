// Volet 1 — test unitaire du parser SMS (miroir de src/app/api/sms-ingest/route.ts)
// Pas de dependances : parse pur.

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSms(from, rawSms) {
  const sms = normalize(rawSms);
  const f = (from || "").toLowerCase();

  if (f.includes("bankily") || /\(bankily\)/i.test(sms)) {
    const pm = sms.match(/[+\s]?222\s*(\d{8,})/);
    let am = sms.match(/transfert\s+recu\s*:\s*(\d+(?:[.,]\d+)?)/i);
    if (!am) am = sms.match(/(\d+(?:[.,]\d+)?)\s*MRU/i);
    if (pm && am) return { method: "Bankily", amount: Math.round(parseFloat(am[1].replace(",", "."))), senderPhone: pm[1].replace(/\s/g, "") };
  }

  if (f.includes("bmci") || f.includes("masrvi") || /pour la facture/i.test(sms)) {
    const pm = sms.match(/[+\s]222\s+([\d][\d\s]*?)\s*\(/);
    const am = sms.match(/a\s+paye\s+(\d+(?:[.,]\d+)?)\s*MRU/i);
    if (pm && am) return { method: "Masrvi", amount: Math.round(parseFloat(am[1].replace(",", "."))), senderPhone: pm[1].replace(/\s/g, "") };
  }

  if (f.includes("click")) {
    const am = sms.match(/a\s+paye\s+(\d+(?:[.,]\d+)?)\s*MRU/i);
    let pm = sms.match(/[+\s]222\s+([\d][\d\s]*?)\s+a\s+paye/i);
    let senderPhone = "";
    if (pm) {
      senderPhone = pm[1].replace(/\s/g, "");
    } else {
      const pm2 = sms.match(/Client\s+\*(\d+)/i);
      senderPhone = pm2 ? pm2[1] : "";
    }
    if (am) return { method: "Click", amount: Math.round(parseFloat(am[1].replace(",", "."))), senderPhone };
  }

  if (f.includes("bim") && !f.includes("bci")) {
    const m = sms.match(/recu\s+(\d+(?:[.,]\d+)?)\s*MRU\s+du\s+(\d{8,})/i);
    if (m) return { method: "BIM", amount: Math.round(parseFloat(m[1].replace(",", "."))), senderPhone: m[2] };
  }

  if (f.includes("bci") || f.includes("bcipay")) {
    const m = sms.match(/recu\s+(\d+(?:[.,]\d+)?)\s*MRU\s+du\s+(\d{8,})/i);
    if (m) return { method: "BCIPAY", amount: Math.round(parseFloat(m[1].replace(",", "."))), senderPhone: m[2] };
  }

  if (f.includes("sedad")) {
    const m = sms.match(/recu\s+(\d+(?:[.,]\d+)?)\s*MRU\s+d[eu]\s+(\d{8,})/i);
    if (m) return { method: "Sedad", amount: Math.round(parseFloat(m[1].replace(",", "."))), senderPhone: m[2] };
  }

  return null;
}

const cases = [
  { name: "Bankily", from: "BANKILY", sms: "Transfert recu : 9911  de +22246999999 (BANKILY)\n#REF12345",         expect: { method: "Bankily", amount: 9911, senderPhone: "46999999" } },
  { name: "Masrvi",  from: "BMCI",    sms: "Client +222 46 99 99 99 (REF776754) a paye 9922.00 MRU pour la facture #.", expect: { method: "Masrvi",  amount: 9922, senderPhone: "46999999" } },
  { name: "Click",   from: "Click",   sms: "Client +222 46 99 99 99 a paye 9933.00 MRU. (REF9829268).",             expect: { method: "Click",   amount: 9933, senderPhone: "46999999" } },
  { name: "BIM",     from: "BIM",     sms: "Vous avez recu 9944 MRU du 46999999",                                    expect: { method: "BIM",     amount: 9944, senderPhone: "46999999" } },
  { name: "BCIPAY",  from: "BCIPAY",  sms: "Vous avez recu 9955 MRU du 46999999",                                    expect: { method: "BCIPAY",  amount: 9955, senderPhone: "46999999" } },
  { name: "Sedad",   from: "Sedad",   sms: "Vous avez recu 9966.0 MRU du 46999999",                                  expect: { method: "Sedad",   amount: 9966, senderPhone: "46999999" } },
];

let ok = 0;
let ko = 0;
for (const c of cases) {
  const got = parseSms(c.from, c.sms);
  const pass = got
    && got.method === c.expect.method
    && got.amount === c.expect.amount
    && got.senderPhone === c.expect.senderPhone;
  if (pass) { ok++; console.log(`  [OK] ${c.name.padEnd(8)} amount=${got.amount} phone=${got.senderPhone}`); }
  else       { ko++; console.log(`  [KO] ${c.name.padEnd(8)} expected ${JSON.stringify(c.expect)}  got ${JSON.stringify(got)}`); }
}
console.log(`\nTotal: ${ok}/${cases.length} OK, ${ko} KO`);
process.exit(ko === 0 ? 0 : 1);
