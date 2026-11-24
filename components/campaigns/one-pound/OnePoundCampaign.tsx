"use client";

import { useEffect, useRef, useState } from "react";
import "./OnePoundCampaign.css";

/**
 * EatinOut x WTF Giveaways campaign creative, isolated from the existing app.
 *
 * IMPORTANT: By default this is a design preview. It does not charge money,
 * create subscriptions, enter draws or issue tickets. Only after explicit
 * approval, supply onCheckoutRequested wired to a verified campaign checkout.
 */
export type OnePoundCampaignProps = {
  /** A callback for a LIVE, server-validated campaign checkout. Omit in design preview. */
  onCheckoutRequested?: () => void;
};

const ASSET = "/campaigns/eatinout-one-pound";

const faqs = [
  {
    question: "When do I pay £4.99?",
    answer:
      "After your £1 first month, your Premium subscription renews at £4.99 per month unless you cancel. There is no free trial on this campaign offer.",
  },
  {
    question: "Is the £10,000 guaranteed?",
    answer:
      "No. The offer includes one complimentary entry into a prize draw, not a guaranteed prize. The draw's eligibility rules, dates, entry process and full terms must be confirmed before launch.",
  },
  {
    question: "Can I cancel?",
    answer:
      "The campaign is for a monthly subscription that can be cancelled before the next renewal. The final checkout must clearly explain the cancellation mechanism and terms.",
  },
];

function CampaignMarquee() {
  const message = (
    <>
      YOUR FIRST MONTH FOR £1 <b>✳</b> £10,000 PRIZE DRAW <b>✳</b> EAT OUT MORE <b>✳</b> ONE COMPLIMENTARY ENTRY <b>✳</b>
    </>
  );
  return (
    <div className="announcement" aria-label="Special partner promotion">
      <div className="eoDropMarquee" aria-hidden="true">
        <span>{message}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

function AnimatedPrizeTicket({ onDetails }: { onDetails: () => void }) {
  return (
    <button type="button" className="prize-ticket" onClick={onDetails} aria-label="View £10,000 prize draw details">
      <span className="notch left" aria-hidden="true" />
      <span className="notch right" aria-hidden="true" />
      <span className="ticket-top">
        <span>YOUR COMPLIMENTARY ENTRY</span>
        <span className="wtf">WTF <b>GIVEAWAYS</b></span>
      </span>
      <span className="ticket-line" aria-hidden="true" />
      <span className="ticket-amount">£10,000</span>
      <span className="ticket-bottom">
        <b>PRIZE DRAW<br />ENTRY INCLUDED</b>
        <small>Tap for details ↗</small>
      </span>
    </button>
  );
}

function ClaimScrollLink({ className }: { className?: string }) {
  return (
    <a className={className ?? "button-primary"} href="#offer">
      Get my £1 first month <span className="arrow" aria-hidden="true">↗</span>
    </a>
  );
}

function FoodMosaic() {
  return (
    <div className="food-gallery reveal">
      <div className="food-card"><img src={`${ASSET}/burger.jpg`} alt="Burger and fries" loading="lazy" /><small>FOOD YOU LOVE</small><strong>Burger nights.</strong></div>
      <div className="food-card"><img src={`${ASSET}/sushi.jpg`} alt="Sushi selection" loading="lazy" /><small>FOOD YOU LOVE</small><strong>Sushi dates.</strong></div>
      <div className="food-card"><img src={`${ASSET}/pizza.jpg`} alt="Freshly cooked pizza" loading="lazy" /><strong>Pizza plans.</strong></div>
      <div className="food-card wide"><img src={`${ASSET}/steak.jpg`} alt="Restaurant steak dish" loading="lazy" /><strong>Proper dinners out.</strong></div>
    </div>
  );
}

function StickyClaimBar({ onClaim }: { onClaim: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const update = () => setShow(window.scrollY > 600);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div className={`sticky${show ? " show" : ""}`} aria-hidden={!show}>
      <div className="sticky-price">£1 <small>then £4.99/month</small></div>
      <button type="button" className="sticky-btn" onClick={onClaim} tabIndex={show ? 0 : -1}>Claim the £1 deal ↗</button>
    </div>
  );
}

export default function OnePoundCampaign({ onCheckoutRequested }: OnePoundCampaignProps) {
  const [modal, setModal] = useState<null | "ticket" | "checkout">(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const checkoutRef = useRef<HTMLButtonElement>(null);
  const triggerCheckout = () => {
    if (onCheckoutRequested) onCheckoutRequested();
    else setModal("checkout");
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = [...document.querySelectorAll(".eo-drop .reveal")];
    if (reduce || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (ev: KeyboardEvent) => { if (ev.key === "Escape") setModal(null); };
    document.addEventListener("keydown", onEscape);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onEscape); };
  }, [modal]);

  return (
    <div className="eo-drop">
      <div className="page">
        <CampaignMarquee />
        <header className="navbar">
          <img className="nav-logo" src={`${ASSET}/eatinout-logo.png`} width={162} height={44} alt="EatinOut" />
          <div className="nav-right">
            <span className="brand-pair">WITH <strong>WTF GIVEAWAYS</strong></span>
            <a className="top-cta" href="#offer">THE £1 DEAL ↗</a>
          </div>
        </header>
        <main>
          <section className="hero" aria-labelledby="campaign-heading">
            <div className="hero-inner">
              <div className="hero-copy">
                <div className="eyebrow"><i className="dot" aria-hidden="true" /> THE EATINOUT × WTF GIVEAWAYS DROP</div>
                <h1 id="campaign-heading">GO OUT<br />MORE.<br /><em>FOR £1.</em></h1>
                <p className="hero-sub">Your first month of <strong>EatinOut Premium for just £1.</strong> Plus <span className="plus">one complimentary entry</span> into our partner&apos;s <strong>£10,000 prize draw.</strong></p>
                <div className="mobile-offer"><span className="micro-pill"><span className="iconcheck">✓</span> MEMBER RESTAURANT DEALS</span><span className="micro-pill"><span className="iconcheck">✓</span> 1 FREE DRAW ENTRY</span></div>
                <div className="hero-action desktop-action">
                  <ClaimScrollLink />
                  <p className="hero-disclaimer"><b>£1 today.</b> Then £4.99/month. No free trial. Cancel anytime.<br />Prize draw terms and eligibility apply.</p>
                </div>
              </div>
              <div className="hero-art" aria-label="£1 Premium membership and £10,000 prize draw visual">
                <div className="art-red" aria-hidden="true" />
                <div className="photo-tile tile-1"><img src={`${ASSET}/sushi.jpg`} alt="Sushi meal" /></div>
                <div className="photo-tile tile-2"><img src={`${ASSET}/burger.jpg`} alt="Burger meal" /></div>
                <div className="photo-tile tile-3"><img src={`${ASSET}/pizza.jpg`} alt="Pizza meal" /></div>
                <div className="price-block"><div className="price-top">THE FIRST MONTH</div><div className="price-number">£1</div><div className="price-baseline">OF EATINOUT PREMIUM</div></div>
                <AnimatedPrizeTicket onDetails={() => setModal("ticket")} />
              </div>
            </div>
            <div className="hero-action mobile-action">
              <ClaimScrollLink />
              <p className="hero-disclaimer"><b>£1 today.</b> Then £4.99/month. No free trial. Cancel anytime.<br />Prize draw terms and eligibility apply.</p>
            </div>
          </section>
          <div className="mighty-strip"><div className="mighty-inner"><div><strong>£1</strong><span>FIRST MONTH</span></div><div><strong>£10K</strong><span>PARTNER DRAW</span></div><div><strong>£4.99</strong><span>PER MONTH AFTER</span></div></div></div>
          <section className="dinner-section"><div className="section-inner">
            <div className="reveal"><div className="section-kicker">NOT JUST A PRIZE DRAW</div><h2>THIS IS ABOUT<br /><em>GOING OUT.</em></h2><p className="section-description">The spontaneous dinner. The date night. The family meal. Premium gives you access to offers at participating local restaurants — and more reasons to make plans.</p></div>
            <FoodMosaic />
            <p className="fineprint">Food imagery illustrates the types of dining experiences. Actual restaurants and offers vary by area and availability.</p>
          </div></section>
          <section className="prize-section"><div className="prize-content">
            <div className="reveal"><div className="section-kicker">AND THE EXTRA REASON</div><h2>A SHOT AT<br /><span>£10,000.</span></h2><p>We&apos;ve partnered with WTF Giveaways to add something extra to this EatinOut promotion: one complimentary entry into a £10,000 prize draw, subject to the promotion&apos;s eligibility and full terms.</p><div className="prize-note"><span className="circle">+</span> ONE COMPLIMENTARY ENTRY WITH THIS OFFER</div></div>
            <div className="prize-tap reveal"><div><div className="overline">EATINOUT × WTF GIVEAWAYS</div><strong>DINNER<br />MEETS POSSIBILITY.</strong><p>Membership and prize draw are separate benefits. A draw entry doesn&apos;t guarantee a prize.</p></div><div className="seal">ONE<br />ENTRY<br />✳</div></div>
          </div></section>
          <section className="steps-section"><div className="section-inner"><div className="reveal"><div className="section-kicker">RIDICULOUSLY SIMPLE</div><h2>THREE STEPS.<br />BETTER PLANS.</h2></div>
            <div className="step-list">
              <div className="step-row reveal"><div className="step-num">01</div><div><strong>Join Premium for £1.</strong><p>Pay £1 for the first month instead of starting a free trial.</p></div></div>
              <div className="step-row reveal"><div className="step-num">02</div><div><strong>Make dinner plans.</strong><p>Explore participating local restaurant offers with Premium access.</p></div></div>
              <div className="step-row reveal"><div className="step-num">03</div><div><strong>Get your draw entry.</strong><p>The complimentary partner entry is provided according to the published promotion terms.</p></div></div>
            </div>
          </div></section>
          <section className="join-section eo-drop-hero-link" id="offer"><div className="join-inner">
            <div className="intro"><div className="section-kicker">YOUR CAMPAIGN OFFER</div><h2>ONE POUND.<br />BIG PLANS.</h2><p style={{ fontSize: 15, lineHeight: 1.7, color: "#ffe2e2", maxWidth: 500 }}>All the local restaurant discovery of EatinOut Premium, plus the complimentary WTF Giveaways draw entry.</p></div>
            <div className="join-deal"><div className="big">£1</div><div className="words">FIRST MONTH<br />OF PREMIUM<span>Then £4.99/month</span></div></div>
            <button ref={checkoutRef} type="button" className="join-cta" onClick={triggerCheckout}>Unlock my £1 offer <span style={{ fontSize: 25 }}>↗</span></button>
            <div className="join-terms">No free trial. £1 charged for the first month, followed by £4.99 per month unless cancelled. Prize draw entry subject to eligibility, draw rules and full published terms.</div>
            {!onCheckoutRequested && <small className="checkout-preview-note">Design preview only. No payment or entry will be created.</small>}
          </div></section>
          <section className="faq-section"><div className="section-inner"><div className="section-kicker">GOOD TO KNOW</div><h2>The small print, made simple.</h2>
            <div className="faq">{faqs.map(({ question, answer }, index) => (
              <div key={question} className={`faq-row${expandedFaq === index ? " open" : ""}`}>
                <button type="button" className="faq-q" aria-expanded={expandedFaq === index} onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}>{question}<span aria-hidden="true">{expandedFaq === index ? "−" : "+"}</span></button>
                <div className="faq-a">{answer}</div>
              </div>
            ))}</div>
          </div></section>
        </main>
        <footer className="footer"><div><strong>EATINOUT × WTF GIVEAWAYS — CONCEPT PREVIEW</strong><br />This is an interactive design demonstration only. No checkout, membership or giveaway entry is created by clicking any button. Before launch: verify draw terms, promotion eligibility, lawful entry mechanics and payment-provider acceptance.</div></footer>
      </div>
      <StickyClaimBar onClaim={triggerCheckout} />
      {modal && (
        <div className="overlay open" role="presentation" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) setModal(null); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="campaign-dialog-title">
            <button ref={closeRef} type="button" className="close" aria-label="Close dialog" onClick={() => setModal(null)}>×</button>
            <div className="tag">{modal === "ticket" ? "PARTNER PRIZE DRAW" : "DESIGN PREVIEW"}</div>
            <h3 id="campaign-dialog-title">{modal === "ticket" ? "One complimentary entry." : "Checkout comes next."}</h3>
            <p>{modal === "ticket" ? "The campaign proposes one complimentary entry into WTF Giveaways’ £10,000 prize draw, subject to eligibility and published terms. Entry does not guarantee a prize." : "This is the visual prototype. The £1 first-month Stripe subscription and verified draw-entry tracking have not been connected yet."}</p>
            <button type="button" className="ok" onClick={() => setModal(null)}>Back to the page</button>
          </div>
        </div>
      )}
    </div>
  );
}
