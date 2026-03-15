import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, Eye, Trash2, Server, ChevronRight, Globe, UserCheck } from "lucide-react";
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
  { id: "overview", label: "Overview" },
  { id: "data-collection", label: "Data we collect" },
  { id: "file-handling", label: "File handling" },
  { id: "cookies", label: "Cookies" },
  { id: "sharing", label: "Data sharing" },
  { id: "retention", label: "Data retention" },
  { id: "your-rights", label: "Your rights" },
  { id: "security", label: "Security measures" },
  { id: "changes", label: "Policy changes" },
  { id: "contact", label: "Contact us" },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-16">
      <HomeHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-1.5 text-cyan-300 text-xs font-medium mb-6">
            <Shield className="w-3.5 h-3.5" />
            Privacy Policy
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            Your privacy matters to us
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Thundocs is built on a foundation of trust. This policy explains exactly what data we collect, how we use it, and your rights over it.
          </p>
          <p className="text-zinc-600 text-sm mt-4">Last updated: February 2026</p>
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

            <Section id="overview" title="Overview">
              <p>
                Thundocs ("we", "us", "our") operates the website at Thundocs.app and the services available through it (the "Service"). We are committed to protecting your personal information and your right to privacy.
              </p>
              <p>
                This Privacy Policy describes how we collect, use, and safeguard information in relation to our Service. If you have questions or concerns about this policy, please contact us at <a href="mailto:privacy@Thundocs.app" className="text-violet-400 hover:text-violet-300 underline">privacy@Thundocs.app</a>.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                {[
                  { icon: Eye, label: "Minimal collection", desc: "We only collect what's needed to run the service" },
                  { icon: Trash2, label: "Auto-deletion", desc: "Files are permanently deleted within 2 hours" },
                  { icon: Lock, label: "Encrypted transit", desc: "All data transfers use TLS 1.2+ encryption" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                      <Icon className="w-5 h-5 text-cyan-400 mb-2" />
                      <p className="text-sm font-semibold text-white mb-1">{item.label}</p>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section id="data-collection" title="Data we collect">
              <p><strong className="text-white">1. Information you provide directly</strong></p>
              <p>
                If you create an account using Google Sign-In, we receive your name, email address, and profile photo from Google. This data is stored only to maintain your account and session preferences.
              </p>
              <p><strong className="text-white">2. Files you upload</strong></p>
              <p>
                Files you upload to process (PDFs, images, Office documents) are handled exclusively by our processing servers. We do not inspect, analyse, or retain your file contents beyond the processing session. See "File handling" below for full details.
              </p>
              <p><strong className="text-white">3. Usage data</strong></p>
              <p>
                We collect anonymous, aggregated usage data (e.g. which tool was used, session duration) to understand how Thundocs is used and to improve performance. This data is not linked to individual users and contains no personally identifiable information.
              </p>
              <p><strong className="text-white">4. Technical data</strong></p>
              <p>
                Standard server logs include IP addresses, browser type, and timestamps. These are retained for no longer than 14 days for security monitoring purposes.
              </p>
            </Section>

            <Section id="file-handling" title="File handling & security">
              <p>
                Your files are the most sensitive thing you share with us, and we treat them accordingly.
              </p>
              <ul className="space-y-3 mt-2">
                {[
                  "Files are uploaded over encrypted HTTPS connections (TLS 1.2 minimum).",
                  "Each upload is assigned a unique, randomly generated identifier. No user identity is permanently linked to any uploaded file.",
                  "Files are stored temporarily in isolated storage during processing only.",
                  "Processed output files and original uploads are automatically and permanently deleted within 2 hours of the session ending.",
                  "Thundocs staff do not access, view, or read the contents of your files at any time.",
                  "Files are never shared with third parties, sold, or used for any purpose other than delivering your requested output.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="cookies" title="Cookies & tracking">
              <p>
                Thundocs uses only strictly necessary cookies to maintain your session (e.g. keeping you signed in). We do not use advertising cookies, third-party tracking cookies, or cookie-based profiling.
              </p>
              <p>
                You may disable cookies in your browser settings at any time. Note that disabling session cookies may prevent you from staying signed in to your account.
              </p>
            </Section>

            <Section id="sharing" title="Data sharing">
              <p>
                We do not sell, trade, rent, or transfer your personal information to any third party.
              </p>
              <p>
                We may share limited data with trusted service providers who assist in operating our Service (e.g. cloud infrastructure providers), under strict confidentiality agreements and only to the extent necessary to deliver the Service.
              </p>
              <p>
                We may disclose data where required by law, court order, or governmental authority, and will aim to notify you to the extent legally permissible.
              </p>
            </Section>

            <Section id="retention" title="Data retention">
              <p>
                We retain different categories of data for different periods:
              </p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border border-zinc-800 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-300">
                      <th className="text-left px-4 py-3 font-medium">Data type</th>
                      <th className="text-left px-4 py-3 font-medium">Retention period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {[
                      ["Uploaded files & outputs", "Deleted within 2 hours"],
                      ["Server logs (IP, timestamps)", "14 days maximum"],
                      ["Account data (name, email)", "Until account deletion"],
                      ["Anonymous usage analytics", "Up to 12 months, aggregated"],
                    ].map(([type, period]) => (
                      <tr key={type} className="bg-zinc-900/30">
                        <td className="px-4 py-3 text-zinc-300">{type}</td>
                        <td className="px-4 py-3 text-zinc-500">{period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="your-rights" title="Your rights">
              <p>
                Depending on your location, you may have the following rights regarding your personal data:
              </p>
              <ul className="space-y-2 mt-2">
                {[
                  ["Right to access", "Request a copy of the personal data we hold about you."],
                  ["Right to rectification", "Ask us to correct inaccurate or incomplete data."],
                  ["Right to erasure", "Request deletion of your personal data (\"right to be forgotten\")."],
                  ["Right to portability", "Receive your data in a portable, machine-readable format."],
                  ["Right to object", "Object to processing of your data for certain purposes."],
                  ["Right to withdraw consent", "Withdraw consent at any time where processing is based on consent."],
                ].map(([right, desc]) => (
                  <li key={right} className="flex items-start gap-3">
                    <UserCheck className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <span><strong className="text-white">{right}:</strong> {desc}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                To exercise any of these rights, contact <a href="mailto:privacy@Thundocs.app" className="text-violet-400 hover:text-violet-300 underline">privacy@Thundocs.app</a>. We will respond within 30 days.
              </p>
            </Section>

            <Section id="security" title="Security measures">
              <p>
                Thundocs implements appropriate technical and organisational measures to protect your data:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {[
                  { icon: Lock, label: "TLS 1.2+ encryption", desc: "All data in transit is encrypted" },
                  { icon: Server, label: "Isolated processing", desc: "Each file is processed in a sandboxed environment" },
                  { icon: Trash2, label: "Automatic deletion", desc: "Files purged on a strict 2-hour timer" },
                  { icon: Globe, label: "Access control", desc: "Strict role-based access for internal systems" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                      <Icon className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="text-xs text-zinc-500">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section id="changes" title="Policy changes">
              <p>
                We may update this Privacy Policy from time to time. When we make changes, we will update the "Last updated" date at the top of this page. For significant changes, we will notify signed-in users via email. We encourage you to review this policy periodically.
              </p>
            </Section>

            <Section id="contact" title="Contact us">
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
              </p>
              <div className="mt-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                <p className="text-white font-medium mb-1">Thundocs Privacy Team</p>
                <a href="mailto:privacy@Thundocs.app" className="text-violet-400 hover:text-violet-300 underline text-sm">privacy@Thundocs.app</a>
              </div>
              <p className="mt-4">
                You also have the right to lodge a complaint with your local data protection authority if you believe we have not complied with applicable data protection laws.
              </p>
            </Section>

          </main>
        </div>
      </div>
    </div>
  );
}
