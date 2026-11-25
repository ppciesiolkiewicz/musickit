import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { A, LegalSections, Mail, Out, type LegalSection } from "@/components/legal";
import { AnalyticsSwitch } from "@/components/AnalyticsChoice";
import { PRIVACY_UPDATED } from "@/features/account/terms";

/*
 * The privacy policy. Public, linked from the footer, the terms of use and the places an account is made (/account/setup,
 * a teacher invite). Plain English, one short section per subject. It names every company that handles a player's data
 * and what each one gets, so a change to analytics, hosting, email or the database is a change to this page too
 * (and a new `PRIVACY_UPDATED`). Written for Australia first (the Privacy Act, the Spam Act), with what a reader in
 * Europe or the UK is owed as well. The counting rules it promises are code: lib/analyticsChoice.ts.
 */

export const metadata: Metadata = {
  title: "Privacy policy · attunr",
  description: "What attunr keeps about you, why, which companies handle it, how long it is kept, and how to see, change or delete it.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS: LegalSection[] = [
  {
    title: "Who we are",
    body: (
      <>
        <p>attunr is run by Piotr Ciesiolkiewicz, trading as attunr, a sole trader in Australia (ABN 48 737 987 261). We decide what data attunr keeps and why, so we are the one to ask about it.</p>
        <p>You can reach us at <Mail />. This policy goes with the <A href="/terms">terms of use</A>.</p>
      </>
    ),
  },
  {
    title: "What we keep",
    body: (
      <>
        <p>We keep what the app needs to work, and nothing we don&apos;t use.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your account: your email, your name, your role (player or teacher), the plan you chose, when you agreed to the terms, and whether you asked for news emails. If you log in with Google, Google tells us your email, your name and an id for your Google account. We never see your Google password.</li>
          <li>What you make: your practice plans, your answers to the questions, your ratings, how long you practiced each day, your notes, your voice type and range, and the videos you record and save.</li>
          <li>Where you are logged in: for each browser, the kind of browser and when you last used it.</li>
          <li>Messages you send us: the message and the email you gave, from the contact form, the feedback page or the early-access list.</li>
        </ul>
        <p>There is no password. We email you a link and a code, and we store them only in a scrambled form, for an hour.</p>
        <p>An account needs your email and a name. Everything else is yours to give or leave out.</p>
        <p>The tuner, the looper and the singing drills listen through your microphone in your browser. That sound is never sent to us. A video reaches us only when you save it.</p>
      </>
    ),
  },
  {
    title: "Teachers and students",
    body: (
      <>
        <p>A teacher who adds a student gives us the student&apos;s name and email. The student then has their own account.</p>
        <p>A teacher sees what their students practice: the plan, the ratings and the time. A student sees the week of practice their teacher makes for them. Nobody else sees either.</p>
        <p>The teacher or school must have the consent it needs from a student, or from a parent or guardian, before adding them.</p>
      </>
    ),
  },
  {
    title: "Cookies and your browser",
    body: (
      <>
        <p>attunr sets two cookies when you log in. One keeps you logged in, and one tells the page that you are. They last a year from your last visit and are removed when you log out.</p>
        <p>A third cookie notes which rule about counting visits applies where you are: ask first, or count. It holds one of those two words, not your country, and it goes when you close the browser.</p>
        <p>Your browser also stores your setup on that device: the theme, your audio devices, the settings of each tool, and your answer about counting visits. This stays in your browser and is not sent to us.</p>
        <p>We set no advertising cookies and no tracking cookies.</p>
      </>
    ),
  },
  {
    title: "How we count use",
    body: (
      <>
        <p>We count which pages are opened and which tools are used, and we record errors, so we know what to fix and what to build. Two services do this: Vercel Analytics and PostHog.</p>
        <p>Neither one sets a cookie or stores anything in your browser. We don&apos;t send them your name or your email, and we don&apos;t link what they count to your account. An invite link or a log-in link is cut out of a page&apos;s address before the address is counted.</p>
        <p>Like every site you visit, they see your IP address and the kind of browser you use when your browser calls them. They use it to tell one visitor from another for a day, and Vercel works out a rough country from it. Neither keeps the address.</p>
        <p>You decide whether you are counted. In the European Union, Iceland, Liechtenstein, Norway and Switzerland we ask first, and count nothing until you say yes. Everywhere else we count until you say no. If your browser sends Global Privacy Control, we take that as a no.</p>
        <p>You can change your answer here at any time. The page loads again when you do.</p>
        <AnalyticsSwitch />
      </>
    ),
  },
  {
    title: "Why we use it",
    body: (
      <>
        <p>We use your data to run your account, to put your plans together, to save what you make, to show a teacher their students&apos; practice, to reply to you, and to keep attunr safe and working.</p>
        <p>We email you about your account and about changes to attunr. News and offers are sent only if you ask for them, and every one of those emails has a link to stop them.</p>
        <p>We don&apos;t sell your data, we don&apos;t share it for advertising, and we don&apos;t use what you make to train an AI.</p>
        <p>Your plan is put together by our own code from your answers and ratings. It chooses exercises. It decides nothing else about you.</p>
        <p>If you are in Europe or the UK, the law asks us to name our grounds. We use your account data and what you make to keep our contract with you. We count use and guard against misuse because we have a fair interest in a working, safe app. We send news only with your consent, which you can take back at any time.</p>
      </>
    ),
  },
  {
    title: "Who else handles it",
    body: (
      <>
        <p>These companies handle data for us. Each one gets only what its job needs, and may use it only for that job.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Vercel runs the site, stores your videos and files, and counts page views.</li>
          <li>Supabase holds the database: your account and what you make.</li>
          <li>Resend sends our emails, so it sees your email address and the email itself.</li>
          <li>Google logs you in, if you choose Google.</li>
          <li>PostHog counts use and records errors.</li>
          <li>When paid plans open, a payment provider will handle your card. We will name it here before then.</li>
        </ul>
        <p>Some of these companies keep data outside Australia, in the United States and the European Union. By using attunr you agree that your data may be kept there.</p>
        <p>We give your data to no one else, unless the law makes us or you ask us to.</p>
      </>
    ),
  },
  {
    title: "How long we keep it",
    body: (
      <>
        <p>We keep your account and what you make for as long as your account is open.</p>
        <p>When you delete your account, your account, plans, ratings, notes and videos are removed straight away. A note or plan that someone else copied from your share link is theirs and stays.</p>
        <p>A browser you stop using is logged out a year after its last visit.</p>
        <p>We keep a message you sent us, and your email on the early-access list, until you ask us to remove it.</p>
      </>
    ),
  },
  {
    title: "Your choices",
    body: (
      <>
        <p>You can see and change your name, your plan and your news emails on <A href="/account">Your profile</A>. Your plans and notes are on their own pages.</p>
        <p>You can delete your account on <A href="/account">Your profile</A>, with Delete account at the bottom of the page.</p>
        <p>For a copy of everything we hold about you, in a file you can take elsewhere, email <Mail />. Email us too if you want something corrected, or want us to stop using some of your data. We answer within 30 days, and it costs nothing.</p>
        <p>If you think we handled your data wrongly, tell us first and we will put it right. If you are not happy with our answer, you can complain to the <Out href="https://www.oaic.gov.au/privacy/privacy-complaints">Office of the Australian Information Commissioner</Out>, or to the data protection authority of the country you live in.</p>
      </>
    ),
  },
  {
    title: "Children",
    body: (
      <>
        <p>You must be 16 or older to make your own account. A younger student uses attunr through a teacher or a school, or with a parent or guardian who agrees for them.</p>
        <p>We send a student&apos;s account no news or offers unless they ask, and we show a student no advertising.</p>
        <p>A parent or guardian can ask us at <Mail /> to see, correct or delete a child&apos;s data. If a child has made an account without a parent, a guardian or a teacher, tell us and we will delete it.</p>
      </>
    ),
  },
  {
    title: "Keeping it safe",
    body: (
      <>
        <p>Everything between your browser and attunr is encrypted. There are no passwords to steal, and log-in links and codes are stored scrambled and work once.</p>
        <p>No service is perfectly safe. If your data is ever exposed in a way that could harm you, we will email you and tell you what happened and what to do.</p>
      </>
    ),
  },
  {
    title: "Changes to this policy",
    body: (
      <p>We can change this policy. If we change what we keep, why we use it or who handles it, we email you at least 30 days before the change applies. A change for the clearer, or to meet the law, can apply straight away. The date at the top says when the policy last changed.</p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <PageShell active="/privacy" column title="Privacy policy" intro={`Plain words on what we keep about you, why, and who else handles it. Last changed ${PRIVACY_UPDATED}.`}>
      <LegalSections sections={SECTIONS} about="your data" />
    </PageShell>
  );
}
