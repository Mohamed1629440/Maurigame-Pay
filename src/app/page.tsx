import HeroDemo from "./_marketing/HeroDemo";

export const metadata = {
  title: "Maurigame Pay — Encaissez Bankily, Masrvi, Sedad, BIM et Click",
  description:
    "Maurigame Pay - منصة دفع إلكتروني في موريتانيا لدعم Bankily وMasrvi وSedad وBIM وClick."
};

const OPERATORS = [
  { name: "Bankily", color: "#0066B3", logo: "/payments/bankily.png" },
  { name: "Masrvi", color: "#E30613", logo: "/payments/masrvi.png" },
  { name: "Sedad", color: "#1A7A3D", logo: "/payments/sedad.png" },
  { name: "BIM", color: "#003F7F", logo: "/payments/bim.png" },
  { name: "Click", color: "#F59E0B", logo: "/payments/click.png" },
];

export default function HomePage() {
  return (
    <>
      {/* HERO ============================================== */}
      <section className="relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-[1.15fr_1fr] gap-10 sm:gap-12 items-center">
          <div>
            <div className="kp-eyebrow text-[var(--bronze)] mb-5">
              — Maurigame Pay · منصة الدفع الإلكتروني في موريتانيا
            </div>
            <h1 className="kp-hero-title text-[var(--ink)] mb-6 text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">
              اشحن رصيدك بسهولة وسرعة.
              <br />
              <em>دفع إلكتروني واحد وسهل.</em>
            </h1>
            <p className="text-base sm:text-lg text-[var(--stone-600)] leading-relaxed max-w-xl mb-7">
              Maurigame Pay يربط متجرك بمنصة دفع إلكتروني سهلة وآمنة.
              <strong className="text-[var(--ink)]">
                Bankily, Masrvi, Sedad, BIM et Click
              </strong>{" "}
              يتم الدفع بسهولة وسرعة، مع تأكيد فوري للعمليات.
              يدعم المتاجر والخدمات والاشتراكات الرقمية بسهولة..
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <a href="/sandbox" className="kp-btn kp-btn-primary">
                افتح تجربة الدفع →
              </a>
              <a href="#fonctionnement" className="kp-btn kp-btn-ghost">
                كيف تعمل المنصة ؟
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[13px] text-[var(--stone-600)]">
              <div className="flex items-center gap-2">
                <span className="kp-pulse"></span>
                <span> المنصة تعمل الآن </span>
              </div>
              <div>5 طرق دفع مدعومة</div>
              <div>تأكيد الدفع خلال أقل من ثانية</div>
            </div>
          </div>

          <div className="relative">
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* OPÉRATEURS ============================================== */}
      <section
        id="operateurs"
        className="border-t border-b border-[var(--stone-200)] bg-[var(--paper-warm)]"
      >
        <div className="max-w-[1280px] mx-auto px-6 py-10">
          <p className="kp-eyebrow text-center text-[var(--stone-500)] mb-7">
            — 5 طرق دفع محلية، بتكامل سهل وسريع
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 items-stretch">
            {OPERATORS.map((op) => (
              <div
                key={op.name}
                className="flex flex-col items-center justify-center gap-2 py-5 px-3 bg-white rounded-sm border border-[var(--stone-200)] hover:border-[var(--bronze-light)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={op.logo}
                  alt={op.name}
                  className="h-7 sm:h-8 object-contain"
                  loading="lazy"
                />
                <div className="serif text-[13px] sm:text-sm font-medium text-[var(--ink)] tracking-tight">
                  {op.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI ============================================== */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <p className="kp-eyebrow text-[var(--bronze)] mb-4">— — لماذا Maurigame Pay? </p>
          <h2 className="kp-section-title text-[var(--ink)]">
            ثلاثة أشياء تجعل Maurigame Pay مختلفًا.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 sm:gap-10">
          <Pillar
            roman="i"
            title="Tous les opérateurs, une seule API"
            text="Bankily, Masrvi, Sedad, BIM, Click. Vous intégrez une fois — vos clients paient avec leur portefeuille préféré. Aucun contrat opérateur à signer."
          />
          <Pillar
            roman="ii"
            title="Confirmation en temps réel"
            text="Le SMS de paiement déclenche automatiquement la validation côté serveur, et votre application en est notifiée par webhook en moins d'une seconde."
          />
          <Pillar
            roman="iii"
            title="Souveraineté totale"
            text="Code, données et exploitation maîtrisés à Nouakchott. Pas de Stripe, pas de détour international. Le MRU reste en Mauritanie."
          />
        </div>
      </section>

      {/* FONCTIONNEMENT ============================================== */}
      <section id="fonctionnement" className="bg-[var(--ink)] text-white">
        <div className="max-w-[1280px] mx-auto px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="kp-eyebrow text-[var(--bronze-light)] mb-4">
              — كيف تعمل المنصة ؟
            </p>
            <h2 className="kp-section-title">
              تدفق بسيط وسلس,
              <br />
              <em className="text-[var(--bronze-light)]">trois étapes.</em>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px border-y border-white/10">
            <Step
              num="01"
              title="أنشئ طلب دفع"
              text={
                <>
                  Votre serveur appelle{" "}
                  <code className="text-[var(--bronze-light)] font-mono text-sm">
                    POST /api/demo
                  </code>{" "}
                  avec le numéro du payeur, le montant et l'opérateur. KitPay retourne
                  une <em>référence</em> unique.
                </>
              }
            />
            <Step
              num="02"
              title="Le client paie"
              text="Il ouvre Bankily (ou Masrvi, Sedad...) et envoie le montant exact au numéro marchand. Aucun compte à créer chez nous, aucune intégration côté client."
            />
            <Step
              num="03"
              title="Vous recevez un webhook"
              text="Le SMS de confirmation est détecté, parsé et matché à la référence. KitPay vous notifie en moins d'une seconde — vous déclenchez la livraison."
            />
          </div>

          <div className="text-center mt-10">
            <p className="font-mono text-xs text-stone-400 tracking-wider">
              <span className="kp-pulse mr-2"></span>
              FLUX OPÉRATIONNEL EN PRODUCTION
            </p>
          </div>
        </div>
      </section>

      {/* SANDBOX ============================================== */}
      <section
        id="demo"
        className="max-w-[1280px] mx-auto px-6 py-16 sm:py-20"
      >
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 sm:gap-12 items-center">
          <div>
            <p className="kp-eyebrow text-[var(--bronze)] mb-4">— Sandbox</p>
            <h2 className="kp-section-title text-[var(--ink)] mb-5">
              Une place de démo
              <br />
              <em>pour vraiment essayer.</em>
            </h2>
            <p className="text-[var(--stone-600)] leading-relaxed mb-6 max-w-xl">
              Choisissez un article réel — ticket démo, abonnement SaaS, commande
              e-commerce ou consultation — entrez votre numéro et votre email, et
              payez en MRU. Vous recevez le reçu par email et suivez la confirmation
              en temps réel.
            </p>
            <ul className="space-y-2.5 text-[15px] text-[var(--stone-700)] mb-7">
              <li className="flex gap-3 items-start">
                <CheckIcon className="text-[var(--bronze)] mt-1 shrink-0" />
                <span>4 articles concrets à tester (50 à 7 500 MRU)</span>
              </li>
              <li className="flex gap-3 items-start">
                <CheckIcon className="text-[var(--bronze)] mt-1 shrink-0" />
                <span>Reçu par email après confirmation</span>
              </li>
              <li className="flex gap-3 items-start">
                <CheckIcon className="text-[var(--bronze)] mt-1 shrink-0" />
                <span>Voir la requête API et le webhook attendu</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <a href="/sandbox" className="kp-btn kp-btn-primary">
                Ouvrir la sandbox →
              </a>
              <a href="/demo" className="kp-btn kp-btn-ghost">
                Démo marchand
              </a>
            </div>
          </div>
          <div className="relative">
            <SandboxPreview />
          </div>
        </div>
      </section>

      {/* API ============================================== */}
      <section
        id="api"
        className="border-t border-[var(--stone-200)] bg-white"
      >
        <div className="max-w-[1280px] mx-auto px-6 py-16 sm:py-20">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 sm:gap-12 items-start">
            <div>
              <p className="kp-eyebrow text-[var(--bronze)] mb-4">— API REST</p>
              <h2 className="kp-section-title text-[var(--ink)] mb-5">
                Une API simple,
                <br />
                <em>trois endpoints.</em>
              </h2>
              <p className="text-[var(--stone-600)] leading-relaxed mb-7 max-w-xl">
                JSON in · JSON out. Authentification par clé API. Webhooks signés HMAC-SHA256.
                SDK JavaScript en prime, exemples en cURL, Node, Python.
              </p>
              <ul className="space-y-3 text-[15px] text-[var(--stone-700)] mb-8">
                <li className="flex gap-3">
                  <code className="font-mono text-xs text-[var(--bronze)] bg-[var(--paper-warm)] px-2 py-0.5 rounded shrink-0">POST</code>
                  <span><code className="font-mono text-sm">/api/intents</code> — créer un intent de paiement</span>
                </li>
                <li className="flex gap-3">
                  <code className="font-mono text-xs text-[var(--bronze)] bg-[var(--paper-warm)] px-2 py-0.5 rounded shrink-0">GET</code>
                  <span><code className="font-mono text-sm">/api/intents/[ref]</code> — statut d'un intent</span>
                </li>
                <li className="flex gap-3">
                  <code className="font-mono text-xs text-[var(--bronze)] bg-[var(--paper-warm)] px-2 py-0.5 rounded shrink-0">POST</code>
                  <span>Webhook reçu : <code className="font-mono text-sm">payment.confirmed</code></span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <a href="/sandbox" className="kp-btn kp-btn-primary">
                  Tester l'API →
                </a>
                <a href="mailto:hello@example.com?subject=KitPay%20-%20Documentation%20API" className="kp-btn kp-btn-ghost">
                  Documentation
                </a>
              </div>
            </div>

            <div className="bg-[#0e0e0e] text-white rounded-sm p-5 sm:p-7 font-mono text-xs sm:text-sm leading-relaxed shadow-2xl overflow-x-auto border border-[var(--stone-700)]">
              <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <span className="ml-3 text-[10px] tracking-[0.2em] text-stone-400 uppercase font-semibold">curl</span>
              </div>
              <pre className="text-[#e8e6e0] whitespace-pre">
<span className="text-[#f6c177] font-semibold">curl</span> -X POST https://YOUR_DOMAIN/v1/intents \{"\n"}
  -H <span className="text-[#a3d977]">"Authorization: Bearer $KEY"</span> \{"\n"}
  -H <span className="text-[#a3d977]">"Content-Type: application/json"</span> \{"\n"}
  -d <span className="text-[#a3d977]">'{"{"}</span>{"\n"}
    <span className="text-[#7eb8d4]">"amount"</span>: <span className="text-[#f6c177]">2500</span>,{"\n"}
    <span className="text-[#7eb8d4]">"method"</span>: <span className="text-[#a3d977]">"Bankily"</span>,{"\n"}
    <span className="text-[#7eb8d4]">"customer_phone"</span>: <span className="text-[#a3d977]">"+22246123456"</span>,{"\n"}
    <span className="text-[#7eb8d4]">"success_url"</span>: <span className="text-[#a3d977]">"https://votre-app.com/ok"</span>{"\n"}
  <span className="text-[#a3d977]">{"}"}'</span>{"\n\n"}
<span className="text-[#9a968d] italic"># Réponse :</span>{"\n"}
<span className="text-[#e8e6e0]">{"{"}</span>{"\n"}
  <span className="text-[#7eb8d4]">"ref"</span>: <span className="text-[#a3d977]">"KP-A1B2C3"</span>,{"\n"}
  <span className="text-[#7eb8d4]">"status"</span>: <span className="text-[#a3d977]">"pending"</span>,{"\n"}
  <span className="text-[#7eb8d4]">"hosted_url"</span>: <span className="text-[#a3d977]">"https://YOUR_DOMAIN/pay/KP-A1B2C3"</span>,{"\n"}
  <span className="text-[#7eb8d4]">"expires_at"</span>: <span className="text-[#f6c177]">"2026-05-08T..."</span>{"\n"}
<span className="text-[#e8e6e0]">{"}"}</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* TARIFS ============================================== */}
      <section
        id="tarifs"
        className="border-t border-[var(--stone-200)] bg-[var(--paper-warm)]"
      >
        <div className="max-w-[1280px] mx-auto px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="kp-eyebrow text-[var(--bronze)] mb-4">— Tarifs</p>
            <h2 className="kp-section-title text-[var(--ink)]">
              Simple,
              <br />
              <em>aligné sur votre volume.</em>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            <PricingCard
              tier="Sandbox"
              price="5 MRU"
              priceSub="paiement symbolique"
              features={[
                "Vrais paiements 5 à 50 MRU",
                "Tous les opérateurs",
                "Confirmation temps réel",
                "Aucun compte requis",
              ]}
              cta="Ouvrir la sandbox"
              ctaHref="/sandbox"
            />
            <PricingCard
              tier="Starter"
              price="2 %"
              priceSub="par transaction"
              features={[
                "Production active",
                "5 opérateurs",
                "Webhooks signés",
                "Dashboard inclus",
                "Support email",
              ]}
              cta="Démarrer"
              ctaHref="mailto:hello@example.com?subject=KitPay%20-%20Plan%20Starter"
              featured
              popular
            />
            <PricingCard
              tier="Volume"
              price="Sur devis"
              priceSub="dès 1M MRU/mois"
              features={[
                "Tarif dégressif",
                "SLA garanti",
                "Onboarding dédié",
                "Support prioritaire",
                "Domaine personnalisé",
              ]}
              cta="Nous contacter"
              ctaHref="mailto:hello@example.com?subject=KitPay%20-%20Plan%20Volume"
            />
          </div>

          <p className="mt-8 text-center text-xs text-[var(--stone-500)]">
            Tous les prix en MRU TTC · Aucun frais d'installation · Pas d'engagement
          </p>
        </div>
      </section>

      {/* CTA FINAL ============================================== */}
      <section className="bg-[var(--ink)] text-white border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 py-14 sm:py-16 text-center">
          <p className="kp-eyebrow text-[var(--bronze-light)] mb-4">— Prêt à intégrer ?</p>
          <h2 className="kp-section-title mb-5">
            Encaissez votre premier paiement
            <br />
            <em className="text-[var(--bronze-light)]">aujourd'hui.</em>
          </h2>
          <p className="text-stone-300 max-w-xl mx-auto mb-8">
            Documentation, exemples de code, sandbox interactive — tout est en ligne.
            Premier appel API en moins de cinq minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/sandbox" className="kp-btn kp-btn-primary">
              Ouvrir la sandbox →
            </a>
            <a
              href="mailto:hello@example.com"
              className="kp-btn kp-btn-ghost"
              style={{ borderColor: "rgba(255,255,255,0.3)", color: "white" }}
            >
              Nous contacter
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function PricingCard({
  tier,
  price,
  priceSub,
  features,
  cta,
  ctaHref,
  featured,
  popular,
}: {
  tier: string;
  price: string;
  priceSub: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
  popular?: boolean;
}) {
  const cardClass = featured
    ? "relative bg-[var(--ink)] text-white p-7 sm:p-8 rounded-sm shadow-[0_24px_60px_-12px_rgba(58,52,42,0.45)] ring-2 ring-[var(--bronze)]"
    : "relative bg-white p-7 sm:p-8 rounded-sm border border-[var(--stone-200)] hover:border-[var(--bronze)] transition-colors";

  return (
    <div className={cardClass}>
      {popular && (
        <span className="absolute -top-3 left-7 bg-[var(--bronze)] text-white text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-full font-bold">
          Populaire
        </span>
      )}
      <h3 className={`serif text-2xl font-medium tracking-tight mb-1 ${featured ? "text-white" : "text-[var(--ink)]"}`}>
        {tier}
      </h3>
      <div className="mt-4">
        <span className={`serif text-4xl font-bold tracking-tight ${featured ? "text-white" : "text-[var(--ink)]"}`}>
          {price}
        </span>
        <p className={`text-xs mt-1 ${featured ? "text-[var(--bronze-light)]" : "text-[var(--stone-500)]"}`}>
          {priceSub}
        </p>
      </div>
      <ul className={`mt-6 space-y-2 text-sm ${featured ? "text-stone-200" : "text-[var(--stone-700)]"}`}>
        {features.map((f) => (
          <li key={f} className="flex gap-2.5 items-start">
            <CheckIcon
              className={`mt-0.5 shrink-0 ${featured ? "text-[var(--bronze-light)]" : "text-[var(--bronze)]"}`}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={ctaHref}
        className={`mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold tracking-wide text-xs uppercase transition-all duration-300 hover:-translate-y-0.5 ${
          featured
            ? "bg-white text-[var(--ink)] hover:bg-[var(--bronze-light)]"
            : "bg-[var(--ink)] text-white hover:bg-[var(--bronze)]"
        }`}
      >
        {cta} →
      </a>
    </div>
  );
}

function Pillar({
  roman,
  title,
  text,
}: {
  roman: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="serif italic text-[var(--bronze)] text-2xl mb-3">
        {roman}.
      </div>
      <h3 className="serif text-xl font-medium mb-3 text-[var(--ink)]">{title}</h3>
      <p className="text-[var(--stone-600)] leading-relaxed">{text}</p>
    </div>
  );
}

function Step({
  num,
  title,
  text,
}: {
  num: string;
  title: string;
  text: React.ReactNode;
}) {
  return (
    <div className="p-7 sm:p-8 bg-white/[0.02]">
      <div className="font-mono text-[11px] tracking-[0.3em] text-[var(--bronze-light)] mb-4">
        {num}
      </div>
      <h3 className="serif text-xl sm:text-2xl font-medium mb-3">{title}</h3>
      <p className="text-stone-300 text-sm sm:text-[15px] leading-relaxed">{text}</p>
    </div>
  );
}

function SandboxPreview() {
  return (
    <div className="bg-[var(--ink)] text-white rounded-sm p-5 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed shadow-2xl">
      <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] tracking-wider text-stone-500 uppercase">
          POST /api/demo
        </span>
      </div>
      <pre className="text-stone-300">
        <span className="text-[var(--bronze-light)]">{"{"}</span>
        {"\n  "}
        <span className="text-emerald-300">"reference"</span>: <span className="text-orange-300">"DEMO-X1Y2"</span>,
        {"\n  "}
        <span className="text-emerald-300">"amount"</span>: <span className="text-blue-300">2500</span>,
        {"\n  "}
        <span className="text-emerald-300">"operator"</span>: <span className="text-orange-300">"bankily"</span>,
        {"\n  "}
        <span className="text-emerald-300">"phone"</span>: <span className="text-orange-300">"+22246123456"</span>,
        {"\n  "}
        <span className="text-emerald-300">"status"</span>: <span className="text-orange-300">"pending"</span>
        {"\n"}
        <span className="text-[var(--bronze-light)]">{"}"}</span>
      </pre>
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] tracking-wider text-stone-500 uppercase">
        <span className="kp-pulse"></span>
        En attente de paiement…
      </div>
    </div>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
