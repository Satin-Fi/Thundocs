import React from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronRight, AlertTriangle, Scale, CheckCircle, XCircle } from "lucide-react";
import { HomeHeader } from "@/components/HomeHeader";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-10 border-b border-zinc-800 last:border-0">
      <h2 className="text-2xl font-bold text-white mb-5">{title}</h2>
      <div className="space-y-4 text-zinc-400 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

const toc = [
  { id: "agreement", label: "Agreement to terms" },
  { id: "service", label: "The service" },
  { id: "permitted-use", label: "Permitted use" },
  { id: "prohibited", label: "Prohibited conduct" },
  { id: "accounts", label: "User accounts" },
  { id: "ip", label: "Intellectual property" },
  { id: "disclaimer", label: "Disclaimer of warranties" },
  { id: "liability", label: "Limitation of liability" },
  { id: "termination", label: "Termination" },
  { id: "governing-law", label: "Governing law" },
  { id: "changes", label: "Changes to terms" },
  { id: "contact", label: "Contact" },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-16">
      <HomeHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-amber-300 text-xs font-medium mb-6">
            <Scale className="w-3.5 h-3.5" />
            Terms of Service
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Please read these terms carefully before using Thundocs. By accessing or using the Service, you agree to be bound by these terms.
          </p>
          <p className="text-zinc-600 text-sm mt-4">Last updated: February 2026 · Effective immediately</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Table of contents */}
          <aside className="lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">Contents</p>
              <nav className="space-y-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 py-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors group"
                  >
                    <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 shrink-0" />
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1">

            <Section id="agreement" title="Agreement to Terms">
              <p>
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you") and Thundocs ("we", "us", "our") governing your access to and use of the Thundocs website and services (collectively, the "Service").
              </p>
              <p>
                By accessing or using the Service in any way, you confirm that you have read, understood, and agree to be bound by these Terms and our <Link to="/privacy" className="text-violet-400 hover:text-violet-300 underline">Privacy Policy</Link>. If you do not agree to these Terms, you must immediately cease all use of the Service.
              </p>
            </Section>

            <Section id="service" title="The Service">
              <p>
                Thundocs provides browser-based document processing tools including PDF merging, splitting, compression, conversion, protection, unlocking, and AI-assisted document analysis.
              </p>
              <p>
                The Service is provided "as is" without any guarantee of availability. We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice, and we shall not be liable to you or any third party for any such modification, suspension, or discontinuation.
              </p>
              <p>
                We reserve the right to impose usage limits on any feature to protect service availability for all users and to prevent abuse.
              </p>
            </Section>

            <Section id="permitted-use" title="Permitted Use">
              <p>Subject to these Terms, you are permitted to:</p>
              <ul className="space-y-2 mt-2">
                {[
                  "Use the Service for personal, educational, or commercial document processing.",
                  "Upload files that you own or have the legal right to process.",
                  "Access the Service from any compatible device or browser.",
                  "Create a free account to access additional features.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="prohibited" title="Prohibited Conduct">
              <p>You agree NOT to use the Service to:</p>
              <ul className="space-y-2 mt-3">
                {[
                  "Upload, process, or distribute files containing illegal content, including content that violates copyright, contains malware, or constitutes child sexual abuse material (CSAM).",
                  "Attempt to reverse-engineer, decompile, or otherwise access the source code of the Service without written permission.",
                  "Use automated scripts, bots, or other means to access the Service in a manner that imposes an unreasonable load on our infrastructure.",
                  "Circumvent, disable, or interfere with security features of the Service.",
                  "Resell or commercialise access to the Service without our express written consent.",
                  "Impersonate Thundocs or any of its employees, agents, or affiliates.",
                  "Violate any applicable local, national, or international law or regulation.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-3 mt-5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-200">
                  Violation of these prohibitions may result in immediate account suspension, access termination, and may expose you to civil or criminal liability.
                </p>
              </div>
            </Section>

            <Section id="accounts" title="User Accounts">
              <p>
                Use of core tools does not require registration. Optional account creation is available via Google OAuth. By creating an account, you represent that the information you provide is accurate and complete.
              </p>
              <p>
                You are responsible for maintaining the security of your account and for all activities that occur under your account. You agree to notify us immediately at <a href="mailto:support@Thundocs.app" className="text-violet-400 hover:text-violet-300 underline">support@Thundocs.app</a> of any unauthorised access or suspected breach of security.
              </p>
              <p>
                We reserve the right to suspend or delete accounts that violate these Terms, are inactive for extended periods, or are otherwise misused.
              </p>
            </Section>

            <Section id="ip" title="Intellectual Property">
              <p>
                The Service, including all software, design, text, graphics, logos, and trademarks, is owned by Thundocs and is protected by applicable intellectual property laws. Nothing in these Terms grants you a right or licence to use our intellectual property beyond what is strictly necessary to use the Service.
              </p>
              <p>
                You retain all ownership rights to files you upload. By uploading files, you grant us a limited, temporary licence solely to process those files as part of delivering the requested Service output to you. This licence automatically terminates when the files are deleted.
              </p>
            </Section>

            <Section id="disclaimer" title="Disclaimer of Warranties">
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p>
                We do not warrant that the Service will be uninterrupted, error-free, secure, or free of viruses or other harmful components. We do not guarantee the accuracy or completeness of any output generated by the Service.
              </p>
              <p>
                You use the Service entirely at your own risk. We strongly recommend maintaining backups of your original documents before processing.
              </p>
            </Section>

            <Section id="liability" title="Limitation of Liability">
              <p>
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, Thundocs AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="space-y-2 mt-2">
                {[
                  "Loss of data or documents.",
                  "Loss of profits or revenue.",
                  "Loss of business or goodwill.",
                  "Damage caused by service interruptions.",
                  "Errors or inaccuracies in document processing output.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                Our total aggregate liability to you for any claims arising out of or related to these Terms or the Service shall not exceed the greater of (a) the amount you paid us in the 12 months preceding the claim, or (b) £50 GBP.
              </p>
            </Section>

            <Section id="termination" title="Termination">
              <p>
                We may suspend or terminate your access to the Service at our discretion, with or without notice, for any reason including breach of these Terms. Upon termination, your right to access the Service ceases immediately.
              </p>
              <p>
                You may delete your account at any time from the Profile page. Account deletion triggers immediate removal of all associated personal data from our systems.
              </p>
            </Section>

            <Section id="governing-law" title="Governing Law">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
              <p>
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
              </p>
            </Section>

            <Section id="changes" title="Changes to Terms">
              <p>
                We reserve the right to update these Terms at any time. When we make changes, we will revise the "Last updated" date above. Material changes will be communicated to account holders via email. Continued use of the Service after changes constitutes acceptance of the revised Terms.
              </p>
            </Section>

            <Section id="contact" title="Contact">
              <p>If you have questions about these Terms, please contact us:</p>
              <div className="mt-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                <p className="text-white font-medium mb-1">Thundocs Legal</p>
                <a href="mailto:legal@Thundocs.app" className="text-violet-400 hover:text-violet-300 underline text-sm">legal@Thundocs.app</a>
              </div>
            </Section>

          </main>
        </div>
      </div>
    </div>
  );
}
