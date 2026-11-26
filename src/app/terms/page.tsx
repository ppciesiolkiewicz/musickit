import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { A, LegalSections, Contact, type LegalSection } from "@/components/legal";
import { EARLY_OFFER, PRICING } from "@/features/account/pricing";
import { FIRST_STUDENTS_LINE } from "@/lib/studentOffer";
import { TERMS_VERSIONS, termsVersion } from "@/features/account/terms";
import { paymentsEnabled } from "@/features/account/server/paymentsEnabled";

/*
 * The terms of use. Public, linked from the footer and from the box a new account ticks on /account/setup. Plain English,
 * one short section per subject, so a player can read it; the law part (Australian Consumer Law, the liability cap)
 * is the minimum a sole trader on an ABN needs. Prices come from features/account/pricing.ts so this page and the home
 * pages never disagree. What happens to a player's data is on /privacy; the Privacy section here is its short form.
 */

export const metadata: Metadata = {
  title: "Terms of use · attunr",
  description: "The terms for using attunr: your account, the subscriptions and the early price, how plans are made, the 30-day money-back guarantee, your notes and plans, and what happens if attunr closes.",
  alternates: { canonical: "/terms" },
};

const { player, school } = PRICING;
/**
 * Payments are on (`STRIPE_ENABLED`), read on the server when the page is built: the paid terms then (version 2), with
 * no beta section or beta lines; else the beta terms (version 1). The version's number is saved with each account that
 * agrees (`TERMS_VERSIONS`), so a change to the words here is a new version there.
 */
const PAYMENTS = paymentsEnabled();
const VERSION = termsVersion(PAYMENTS);

const SECTIONS: LegalSection[] = [
  {
    title: "Who we are",
    body: (
      <>
        <p>attunr is run by Piotr Ciesiolkiewicz, trading as attunr, a sole trader in Australia (ABN 48 737 987 261). In these terms, &ldquo;we&rdquo; and &ldquo;attunr&rdquo; mean that business, and &ldquo;you&rdquo; means the person or school using it.</p>
        <p>You can reach us <Contact />.</p>
      </>
    ),
  },
  {
    title: "What these terms cover",
    body: (
      <>
        <p>These terms apply to everything at attunr.app: the Practice plan, Notes, Practice and every tool and lesson in it, and your account. By making an account or using the app you agree to them. If you don&apos;t agree, don&apos;t use attunr.</p>
        <p>If you use attunr for a school, you agree for the school, and you confirm you may do so.</p>
      </>
    ),
  },
  {
    title: "Your account",
    body: (
      <>
        <p>You log in with your email or a Google account. There is no password: we email you a link and a code. Anyone with access to your email can log in as you, so keep that email safe. Tell us at once if you think someone else is using your account.</p>
        <p>One account is for one person. A teacher can add students; each of them gets their own account.</p>
        <p>You must be 16 or older to make your own account. A younger student uses attunr through a teacher or a school, or with a parent or guardian who accepts these terms for them.</p>
        <p>You can delete your account at any time on <A href="/account">Your profile</A>. That removes your account, your plans, your notes and your videos. It does not refund a subscription, except as the money-back guarantee below says.</p>
      </>
    ),
  },
  ...(PAYMENTS ? [] : [{
    title: "The beta",
    body: (
      <p>While attunr is in open beta, everything is free and nothing is charged. You can choose a plan during the beta, and choosing one does not ask you to pay. Some parts are not ready yet. The beta can change or stop, and work made during it may be lost, so keep a copy of anything you need. The subscription terms below start when we open paid plans, and we will tell you by email before then.</p>
    ),
  }]),
  {
    title: "The player subscription",
    body: (
      <>
        <p>A player subscription is for your own practice. It costs {player.monthPrice} a month, or {player.price} a year paid once up front. It gives you:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Practice plans with no limit: a new one each day you open the Practice plan page, and another the same day when you ask. Each is a plan of exercises that attunr puts together for you, as the section on how plans are made says.</li>
          <li>Unlimited use of every tool and lesson: Notes, Practice, the course, the tuner, the metronome and drone, backing tracks, the looper, the singing and ear drills.</li>
        </ul>
        <p>A new subscription can start with a free trial. Its length is shown when you choose your plan. Cancel during the trial and you pay nothing.</p>
        <p>A subscription renews by itself, each month or each year, at the price you are paying, until you cancel. You can cancel at any time on <A href="/account">Your profile</A>, and the subscription then runs to the end of the month or year you paid for. We email you before a yearly subscription renews.</p>
        <p>When your subscription ends, your account stays open. You keep every plan and note you made, and you keep unlimited use of every tool and lesson. Only new practice plans need a subscription.</p>
        <p>Our prices may change. A month or a year you have paid for is never repriced, and we email you at least 30 days before a new price applies to your next renewal.</p>
      </>
    ),
  },
  {
    title: "Teachers and schools",
    body: (
      <>
        <p>A teacher subscription is for a teacher or a school. The teacher plans and their prices are shown on the pricing page and when you choose a plan. The largest plan, for any number of students, is priced by agreement with us. A teacher subscription gives the teacher everything a player subscription does, and it renews and ends in the same way.</p>
        <p>A teacher can add students, make each one a week of practice, and see what each student practices at home. Each student gets their own account, which costs the student nothing, and accepts these terms when they log in.</p>
        <p>A teacher plan covers a number of active students a month. An active student is one you gave a plan in that calendar month: you added them, made their next week or rotated their week. A student you didn&apos;t give a plan that month stays on your list and costs nothing. Each plan also allows a few extra active students a month for free; your Students page tells you when you reach them. Past that, a student who is not yet active that month can&apos;t be given a plan until the next month, unless you change your plan. A student who is already active can always get their next week. The count starts again on the 1st of each month.</p>
        <p>Practice plans are not limited: you pay by active students, not by how many plans you make.</p>
        <p>The teacher or school is responsible for having the consent it needs from a student or their parent or guardian before adding them, and for what it shares with students. A school&apos;s own name and logo on attunr stay the school&apos;s.</p>
        <p>The {school.guaranteeDays}-day money-back guarantee and the rest of these terms apply to a teacher or a school as they do to a player, unless your agreement with us says otherwise.</p>
      </>
    ),
  },
  {
    title: "The early price",
    body: (
      <>
        <p>The first {EARLY_OFFER.students} people who sign up for a player subscription, and the first {EARLY_OFFER.schools} teachers or schools who join as founding partners, get the early price: {EARLY_OFFER.percentOff}% off the price of their plan, paid monthly or yearly. For a player that is {FIRST_STUDENTS_LINE}. A founding partner can choose any teacher plan, of any size.</p>
                <p>&ldquo;First&rdquo; goes by the order people sign up: by when you made your account, or for a founding partner by when we agreed that you join. While places are left, the pricing page shows the early price.{!PAYMENTS && " Nothing is charged during the beta, so the early price starts with your first payment after paid plans open."}</p>
        <p>The early price is locked in: it does not go up for as long as you stay subscribed. If you cancel and subscribe again later, you pay the price shown at that time.</p>
        <p>For the plan priced by agreement, a founding partner pays {EARLY_OFFER.percentOff}% off the price we agree with them.</p>
        <p>A founding partner&apos;s agreement with us can give more than these terms do, such as a longer trial or a longer time to ask for all their money back. Where it does, the agreement applies.</p>
      </>
    ),
  },
  {
    title: "30-day money-back guarantee",
    body: (
      <>
        <p>If attunr isn&apos;t for you, send us a message <Contact /> within {player.guaranteeDays} days of paying and we refund the whole payment. No reason needed. We refund to the card or account you paid with, within 14 days of your message.</p>
        <p>The guarantee covers your first payment for a subscription, once. It does not cover a renewal, a second refund of the same kind, or a payment made more than {player.guaranteeDays} days ago.</p>
        <p>This guarantee is on top of your rights under the Australian Consumer Law, which it does not take away. If attunr is faulty or not as described, you have the remedies that law gives you, however long ago you paid.</p>
      </>
    ),
  },
  {
    title: "Payment",
    body: (
      <>
        <p>Prices are shown in US dollars unless the page says otherwise. Your bank may add a conversion fee. Payment is taken by a payment provider; we never see your full card number. Taxes are included in the price where we must collect them, and the receipt says so.</p>
        <p>If a payment fails or is reversed, the subscription it paid for stops. You keep the plans and notes you already made.</p>
      </>
    ),
  },
  {
    title: "How plans are made",
    body: (
      <>
        <p>attunr puts your plan together on its own servers, from its library of exercises. It reads what you told it in the questions and how you rated past exercises, and picks exercises for the steps you are on in each topic: the next steps you haven&apos;t made solid yet, with a few you have mixed back in. A teacher&apos;s student gets a week made the same way, from where the teacher says the student is. No AI writes your plan, and you don&apos;t need an AI of your own.</p>
        <p>A plan can be wrong: it can set a tempo too fast, name a chord wrongly or ask for a note outside your range. Read a plan as advice from a well-read friend, not a teacher who can see you. We check the exercises before they go into the library, but we can&apos;t catch everything.</p>
        <p>Practice within what feels easy. Stop at any pain in your hands, arms or voice. attunr is not medical advice, and a plan is not a reason to push through pain. If you have an injury or a voice condition, ask a doctor, a physiotherapist or a voice teacher first.</p>
        <p>attunr does not send your plans, your notes or your practice to an AI. If that ever changes, for example to draft a lesson note when you ask for it, these terms will say so first.</p>
        <p>If you use an AI of your own on attunr&apos;s pages, such as an AI extension in your browser, it can read your plans and notes and change them. That AI&apos;s own terms apply to what it reads and what it does.</p>
      </>
    ),
  },
  {
    title: "Your voice and your body",
    body: (
      <>
        <p>Singing takes good technique, and an app can&apos;t always teach all of it. Some of it needs a teacher who can see and hear you and tell you what to change.</p>
        <p>Singing doesn&apos;t need much force. Aim for good technique with a gentle effort, and be gentle with yourself.</p>
        <p>Stop if you feel any pain or discomfort in your throat, or if you feel dizzy or light-headed. Rest until it passes. If it doesn&apos;t pass, or you are worried about your voice, see a voice teacher or a doctor.</p>
      </>
    ),
  },
  {
    title: "Your notes, plans and videos",
    body: (
      <>
        <p>What you make in attunr is yours: your notes, your plans, your ratings, the videos you record. We store it so the app works, and we show it to the people you share it with. You give us the licence we need to do that, and no more. We don&apos;t sell your work or use it to advertise.</p>
        <p>A shared note or plan is public to anyone with its link. Don&apos;t share anything you must keep private. You can stop sharing at any time, but a copy a student has already made is theirs.</p>
        <p>Don&apos;t put anything in attunr that breaks the law, that you don&apos;t have the right to use (a published song&apos;s sheet music, a recording that isn&apos;t yours), or that would harm another person. We can remove such content and close the account that put it there.</p>
      </>
    ),
  },
  {
    title: "Our content and the app",
    body: (
      <>
        <p>The app, its code, the course, the exercises and the design are ours, or licensed to us. You may use them for your own practice and teaching, and a school may use them for its lessons. You may not copy, resell or redistribute them outside attunr.</p>
        <p>The sounds come from tonejs-instruments and Fluid R3 GM under CC BY 3.0, and the photos from Unsplash. Their own licences apply to them.</p>
        <p>Don&apos;t try to get into other people&apos;s accounts or data, overload the service, or take the app apart to copy it. We can block or close an account that does.</p>
      </>
    ),
  },
  {
    title: "Privacy",
    body: (
      <>
        <p>The <A href="/privacy">privacy policy</A> says what we keep about you, why, which companies handle it and how long we keep it. It is part of these terms.</p>
        <p>In short: we store what the app needs, such as your email, your name, and the plans, notes, ratings and videos you make. The tuner and the singing drills listen in your browser to find the pitch; the sound is never sent to us.</p>
        <p>We don&apos;t sell your data and we don&apos;t run advertising. We email you about your account and about changes to attunr; emails with news and offers are only ever opt-in.</p>
        <p>You can see your data and delete your account on <A href="/account">Your profile</A>. For a copy of everything we hold about you, send us a message <Contact />.</p>
      </>
    ),
  },
  {
    title: "If attunr closes",
    body: (
      <>
        <p>attunr is a small business. If we ever have to close it, we will email every account holder at least 60 days before, keep the app running so you can download your plans and notes until then, and refund the months left on any paid subscription. We won&apos;t simply switch it off.</p>
        <p>If attunr is taken over by another business, these terms carry over to it, and you will be told.</p>
      </>
    ),
  },
  {
    title: "What we are not liable for",
    body: (
      <>
        <p>attunr is provided as it is. We work to keep it up and right, but we don&apos;t promise it will never be down, never lose a save, or never make a mistake in a plan or a diagram.</p>
        <p>To the extent the law allows, our liability to you for anything to do with attunr is limited to what you paid us in the 12 months before the claim, and we are not liable for indirect loss such as lost lesson income or lost data you could have kept a copy of.</p>
        <p>Nothing in these terms takes away a right the Australian Consumer Law, or the consumer law of the country you live in, gives you and that can&apos;t be excluded.</p>
      </>
    ),
  },
  {
    title: "Changes to these terms",
    body: (
      <p>We can change these terms. For a change that matters to you (a price, what a plan includes, the guarantee, what we do with your data) we email you at least 30 days before it applies, and you can cancel before then with a refund of the months left. A change for the clearer, or to meet the law, can apply straight away. The date at the top says when the terms last changed.</p>
    ),
  },
  {
    title: "Ending",
    body: (
      <>
        <p>You can stop using attunr at any time, and delete your account on <A href="/account">Your profile</A>. We can close an account that breaks these terms, after telling you why, unless the breach is serious enough that we must act at once.</p>
        <p>These terms are governed by the law of Victoria, Australia. If something in them turns out not to be enforceable, the rest still applies.</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <PageShell active="/terms" column title="Terms of use" intro={`Plain words on what you get, what you pay and what we each promise. Version ${VERSION}, last changed ${TERMS_VERSIONS[VERSION].updated}.`}>
      <LegalSections sections={SECTIONS} about="these terms" source="terms" />
    </PageShell>
  );
}
