
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  HelpCircle,
  LifeBuoy,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PublicLayout from "../../layouts/PublicLayout";

const icons = {
  docs: BookOpen,
  terms: FileText,
  privacy: LockKeyhole,
  security: ShieldCheck,
  faq: HelpCircle,
  support: LifeBuoy,
};

export const PageHero = ({ eyebrow, title, description, icon = "docs" }) => {
  const Icon = icons[icon] || BookOpen;
  return (
    <section className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-br from-[#f4f8ff] via-white to-indigo-50 px-[5%] py-16 sm:py-20">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />
      <div className="absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 shadow-sm">
          <Icon size={15} />
          {eyebrow}
        </div>
        <h1 className="max-w-4xl font-[var(--font-title)] text-4xl font-black leading-tight tracking-[-0.04em] text-gray-950 sm:text-5xl md:text-[3.4rem]">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-gray-600 sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
};

export const ContentCard = ({ title, children, id }) => (
  <section id={id} className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
    <h2 className="font-[var(--font-title)] text-xl font-extrabold tracking-[-0.02em] text-gray-900 sm:text-2xl">
      {title}
    </h2>
    <div className="mt-4 space-y-4 text-sm leading-7 text-gray-600 sm:text-[0.95rem]">
      {children}
    </div>
  </section>
);

export const LinkCard = ({ to, icon: Icon, title, text }) => (
  <Link
    to={to}
    className="group flex gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
  >
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
        Explore <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
      </span>
    </div>
  </Link>
);

export const InfoPage = ({ children, ...hero }) => (
  <PublicLayout>
    <PageHero {...hero} />
    {children}
  </PublicLayout>
);
