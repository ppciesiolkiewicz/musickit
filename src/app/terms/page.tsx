import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { PRICING } from "@/features/account/pricing";

/*
 * The terms of use. Public, linked from the footer and (once it exists) the login page's agreement line. Plain English,
 * one short section per subject, so a player can read it; the law part (Australian Consumer Law, the liability cap)
 * is the minimum a sole trader on an ABN needs. Prices come from features/account/pricing.ts so this page and the home
 * pages never disagree.
 */

export const metadata: Metadata = {
  title: "Terms of use · attunr",
  description: "The terms for using attunr: your account, the yearly subscription and its AI autoplan allowance, how plans are made, the 30-day money-back guarantee, your notes and plans, and what happens if attunr closes.",
  alternates: { canonical: "/terms" },
};

/** Last change to the words on this page; raise it when a term changes, not for a typo. */
const UPDATED = "17 November 2026";
const EMAIL = "hello@attunr.app";

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200">{children}</Link>
);
const Mail = () => <a href={`mailto:${EMAIL}`} className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200">{EMAIL}</a>;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "-");

type Section = { title: string; body: ReactNode };

const { player, school } = PRICING;

const SECTIONS: Section[] = [
  {
    title: "Who we are",
    body: (
      <>
        <p>attunr is run by Piotr Ciesiolkiewicz, trading as attunr, a sole trader in Australia (ABN 48 737 987 261). In these terms, &ldquo;we&rdquo; and &ldquo;attunr&rdquo; mean that business, and &ldquo;you&rdquo; means the person or school using it.</p>
        <p>You can reach us at <Mail />.</p>
      </>
    ),
  },
  {
    title: "What these terms cover",
    body: (
      <>
        <p>These terms apply to everything at attunr.app: the AI autoplan, Notes, Practice and every tool and lesson in it, and your account. By making an account or using the app you agree to them. If you don&apos;t agree, don&apos;t use attunr.</p>
        <p>If you use attunr for a school, you agree for the school, and you confirm you may do so.</p>
      </>
    ),
  },
  {
    title: "Your account",
    body: (
      <>
        <p>You log in with your email or a Google account. There is no password: we email you a link and a code. Anyone with access to your email can log in as you, so keep that email safe. Tell us at once if you think someone else is using your account.</p>
        <p>One account is for one person. A school account can invite its students and teachers; each of them gets their own account.</p>
        <p>You must be 16 or older to make your own account. A younger student uses attunr through a school, or with a parent or guardian who accepts these terms for them.</p>
        <p>You can delete your account at any time on <A href="/account">Your profile</A>. That removes your account, your plans and your notes. It does not refund a subscription, except as the money-back guarantee below says.</p>
      </>
    ),
  },
  {
    title: "The beta",
    body: (
      <p>While attunr is in open beta, everything is free and there is no subscription. Some parts are not ready yet: during the beta, attunr can&apos;t make new plans, and it saves your answers to the questions for your first plan. The beta can change or stop, and work made during it may be lost, so keep a copy of anything you need. The subscription terms below start when we open paid plans, and we will tell you by email before then.</p>
    ),
  },
  {
    title: "The player subscription",
    body: (
      <>
        <p>A player subscription costs {player.price} a year, paid once up front. It gives you:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{player.plansPerMonth} AI autoplans a month. Each autoplan is a plan of exercises that attunr puts together for you, as the section on how plans are made says.</li>
          <li>The same allowance can be spent on AI-written notes instead: one autoplan counts as {player.notesPerPlan} notes, so up to {player.notesPerMonth} notes a month. AI notes are coming; until they open, the whole allowance is autoplans.</li>
          <li>Unlimited use of every other tool and lesson: Notes you write yourself, Practice, the course, the tuner, the metronome and drone, backing tracks, the looper, the singing and ear drills.</li>
        </ul>
        <p>The allowance resets at the start of each month of your subscription. Unused autoplans and notes do not carry over. An autoplan or note is spent when attunr gives it to you, whether or not you keep it.</p>
        <p>When your year ends, your account stays open. You keep every plan and note you made, and you keep unlimited use of every tool. Only new AI autoplans and AI notes need a top-up: a new year, or a smaller top-up of autoplans if we offer one. We do not renew you without asking.</p>
        <p>The price for a new year may change. A year you have paid for is never repriced. We tell you the current price before you pay.</p>
      </>
    ),
  },
  {
    title: "Schools",
    body: (
      <>
        <p>A school subscription is priced for the school, by agreement with us, and comes with a larger autoplan allowance. A school can invite its students and teachers, assign a plan to a student, and see what each student practises at home. A school&apos;s teachers and students each accept these terms when they log in.</p>
        <p>The school is responsible for having the consent it needs from a student or their parent or guardian before inviting them, and for what its teachers share with students. A school&apos;s own name and logo on attunr stay the school&apos;s.</p>
        <p>The {school.guaranteeDays}-day money-back guarantee and the rest of these terms apply to a school as they do to a player, unless the school&apos;s agreement with us says otherwise.</p>
      </>
    ),
  },
  {
    title: "30-day money-back guarantee",
    body: (
      <>
        <p>If attunr isn&apos;t for you, email <Mail /> within {player.guaranteeDays} days of paying and we refund the whole payment. No reason needed. We refund to the card or account you paid with, within 14 days of your email.</p>
        <p>The guarantee covers each first payment for a subscription and each top-up, once. It does not cover a second refund of the same kind, or a payment made more than {player.guaranteeDays} days ago.</p>
        <p>This guarantee is on top of your rights under the Australian Consumer Law, which it does not take away. If attunr is faulty or not as described, you have the remedies that law gives you, however long ago you paid.</p>
      </>
    ),
  },
  {
    title: "Payment",
    body: (
      <>
        <p>Prices are shown in US dollars unless the page says otherwise. Your bank may add a conversion fee. Payment is taken by a payment provider; we never see your full card number. Taxes are included in the price where we must collect them, and the receipt says so.</p>
        <p>If a payment fails or is reversed, the subscription it paid for stops, and any AI autoplans and notes already written in that period count as used.</p>
      </>
    ),
  },
  {
    title: "How plans are made",
    body: (
      <>
        <p>attunr puts your plan together on its own servers, from its library of exercises. It reads what you told it in the questions and how you rated past exercises, and picks exercises for the steps you are on in each topic: the next steps you haven&apos;t made solid yet, with a few you have mixed back in. You don&apos;t need an AI of your own, and you don&apos;t copy anything into one.</p>
        <p>Some plans, and AI notes, are written by an AI that attunr runs for you. A plan can be wrong, whoever made it: it can set a tempo too fast, name a chord wrongly or ask for a note outside your range. Read a plan as advice from a well-read friend, not a teacher who can see you. attunr checks every plan before it reaches you, but it can&apos;t catch everything.</p>
        <p>Practise within what feels easy. Stop at any pain in your hands, arms or voice. attunr is not medical advice, and a plan is not a reason to push through pain. If you have an injury or a voice condition, ask a doctor, a physiotherapist or a voice teacher first.</p>
        <p>attunr sends your data to an AI only when that AI writes a plan or a note for you, and then only what the plan or note needs: your answers, your ratings and the steps you are on.</p>
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
        <p>We store what the app needs: your email, your name, your role, and the plans, notes, ratings and settings you make. The tuner and the singing drills listen in your browser to find the pitch; the sound is never sent to us.</p>
        <p>The site runs on Vercel, with its database and file storage. Log-in emails go through Resend. Google sign-in uses Google. When paid plans open, a payment provider handles your card. Each of them sees only what its job needs.</p>
        <p>We don&apos;t sell your data and we don&apos;t run advertising. We email you about your account and about changes to attunr; a newsletter is only ever opt-in. To see, export or delete your data, use <A href="/account">Your profile</A> or email <Mail />.</p>
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
      <p>We can change these terms. For a change that matters to you (a price, the allowance, the guarantee, what we do with your data) we email you at least 30 days before it applies, and you can cancel before then with a refund of the months left. A change for the clearer, or to meet the law, can apply straight away. The date at the top says when the terms last changed.</p>
    ),
  },
  {
    title: "Ending",
    body: (
      <>
        <p>You can stop using attunr at any time, and delete your account on <A href="/account">Your profile</A>. We can close an account that breaks these terms, after telling you why, unless the breach is serious enough that we must act at once.</p>
        <p>These terms are governed by the law of Australia. If something in them turns out not to be enforceable, the rest still applies.</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <PageShell active="/terms" column title="Terms of use" intro={`Plain words on what you get, what you pay and what we each promise. Last changed ${UPDATED}.`}>
      <div className="flex max-w-3xl flex-col gap-10">
        <nav aria-label="On this page" className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.title}><a href={`#${slug(s.title)}`} className="text-slate-300 hover:text-slate-50"><span className="mr-2 tabular-nums text-slate-500">{i + 1}.</span>{s.title}</a></li>
            ))}
          </ol>
        </nav>
        {SECTIONS.map((s, i) => (
          <section key={s.title} id={slug(s.title)} aria-labelledby={`${slug(s.title)}-h`} className="scroll-mt-24">
            <h2 id={`${slug(s.title)}-h`} className="text-xl text-slate-50" style={{ fontFamily: "var(--font-display), serif" }}>
              <span className="mr-2 tabular-nums text-slate-500">{i + 1}.</span>{s.title}
            </h2>
            <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-slate-300">{s.body}</div>
          </section>
        ))}
        <p className="text-xs text-slate-500">Questions about these terms: <Mail />.</p>
      </div>
    </PageShell>
  );
}
