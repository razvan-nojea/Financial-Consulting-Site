import React from "react";
import { Link } from "react-router";
import {
  Calculator,
  CheckCircle2,
  ChevronRight,
  PiggyBank,
  Shield,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function HomePage() {
  const services = [
    {
      icon: TrendingUp,
      title: "Planificare Financiara Personala",
      description:
        "Strategii personalizate pentru atingerea obiectivelor financiare pe termen lung.",
    },
    {
      icon: PiggyBank,
      title: "Planificare Pensie",
      description:
        "Un traseu clar pentru un viitor financiar mai stabil si mai bine organizat.",
    },
    {
      icon: Shield,
      title: "Strategii de Investitii",
      description: "Recomandari usor de urmarit pentru cresterea si protejarea economiilor.",
    },
    {
      icon: Calculator,
      title: "Gestionarea Datoriilor",
      description: "Solutii practice pentru a intelege mai bine bugetul si ratele lunare.",
    },
  ];

  const benefits = [
    "Consultanta 100% gratuita",
    "Planuri personalizate pentru situatia dvs.",
    "Fara obligatii financiare",
    "Confidentialitate garantata",
    "Experienta in domeniul financiar",
    "Suport continuu si dedicat",
  ];

  const testimonials = [
    {
      name: "Maria Ionescu",
      role: "Antreprenor",
      content:
        "M-a ajutat sa imi organizez finantele si sa imi stabilesc obiective clare. Acum am un plan concret pentru pensie.",
      rating: 5,
    },
    {
      name: "Andrei Popescu",
      role: "Manager IT",
      content:
        "Consultatia a fost foarte valoroasa. Am inteles mai bine cum sa imi investesc banii si cum sa imi structurez economiile.",
      rating: 5,
    },
    {
      name: "Elena Dumitrescu",
      role: "Medic",
      content:
        "Profesionalism si claritate. Am primit recomandari usor de aplicat si un plan realist pentru urmatoarele luni.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen">

      {/* ── HERO — dichotomy split ───────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white">

        {/* Split backgrounds */}
        <div className="pointer-events-none absolute inset-0 flex">
          {/* LEFT — light gray in light mode, near-black navy in dark */}
          <div className="w-full bg-slate-50 dark:bg-[#060c1a] lg:w-[52%]" />
          {/* RIGHT — vivid blue gradient */}
          <div className="hidden lg:block lg:w-[48%] bg-[linear-gradient(145deg,#1e3a8a_0%,#2563eb_55%,#1d4ed8_100%)]" />
        </div>

        {/* Decorative glows — right side only */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block">
          <div className="absolute -top-16 left-8 h-80 w-80 rounded-full bg-blue-300/20 blur-[90px]" />
          <div className="absolute bottom-0 right-8 h-64 w-64 rounded-full bg-cyan-400/15 blur-[70px]" />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-indigo-400/20 blur-[60px]" />
        </div>

        {/* Subtle left-side texture */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[52%] lg:block">
          <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-white/8 to-transparent" />
          <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-900/30 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[90vh] items-center gap-0 lg:grid-cols-[1fr_1fr]">

            {/* ── LEFT — stark dark text column ──────────────────────────── */}
            <div className="space-y-10 py-20 lg:py-28 lg:pr-14">

              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-white/10 bg-blue-50 dark:bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-blue-700 dark:text-blue-300/90 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Aplicație de prezentare și programări
                </div>

                <h1 className="text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.6rem] text-gray-900 dark:text-white">
                  Consultanță<br />
                  financiară<br />
                  <span className="text-blue-400">gratuită.</span>
                </h1>

                <p className="max-w-lg text-base leading-8 text-gray-500 dark:text-slate-400 sm:text-lg">
                  Găsești într-un singur loc prezentarea serviciilor, informații
                  despre consultanță și un mod simplu de a programa o discuție.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/inregistrare">
                  <Button
                    size="lg"
                    className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold sm:w-auto shadow-lg shadow-blue-500/20"
                  >
                    Începe acum
                    <ChevronRight className="ml-1.5" size={18} />
                  </Button>
                </Link>
                <Link to="/servicii">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-gray-300 dark:border-white/15 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-400 dark:hover:border-white/25 sm:w-auto"
                  >
                    Vezi serviciile
                  </Button>
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 border-t border-gray-200 dark:border-white/8 pt-8">
                {[
                  { label: "Consultații", value: "1 la 1" },
                  { label: "Plan personal", value: "Adaptat" },
                  { label: "Programare", value: "Online" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT — vivid image card on blue ───────────────────────── */}
            <div className="relative hidden py-20 lg:flex lg:items-center lg:justify-center lg:py-28 lg:pl-10">

              {/* Card — white in light mode, dark in dark mode */}
              <div className="relative w-full max-w-[440px]">
                <div className="overflow-hidden rounded-[2rem] bg-white dark:bg-[#111827] shadow-[0_40px_100px_rgba(0,0,0,0.45)] ring-1 ring-white/20 dark:ring-white/10">

                  {/* Image */}
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1763933356190-6e86bb9faad8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjBjb25zdWx0aW5nJTIwcHJvZmVzc2lvbmFsJTIwb2ZmaWNlfGVufDF8fHx8MTc3MzEzMTE0MXww&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Consultanta financiara"
                    className="h-64 w-full object-cover"
                  />

                  {/* Feature list inside card */}
                  <div className="divide-y divide-gray-100 dark:divide-white/8 bg-white dark:bg-[#111827] px-6 py-2">
                    {[
                      "Înțelegi mai ușor ce opțiuni ai pentru economii.",
                      "Poți compara servicii și alege rapid o consultație.",
                      "Traseu clar de la prezentare până la programare.",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 py-3.5">
                        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                          <Star size={10} className="fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400" />
                        </div>
                        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -right-4 -top-4 rounded-2xl bg-white dark:bg-[#1e2a3a] px-4 py-2.5 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Consultații
                  </p>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400">100% Gratuit</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="bg-white py-20 dark:bg-[#0f0f0f]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white lg:text-4xl">
              Servicii Oferite
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              Consultanta financiara completa, adaptata nevoilor tale specifice
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.title}
                  className="border-2 transition-all hover:border-blue-500 hover:shadow-lg dark:border-gray-800 dark:bg-[#1a1a1a] dark:hover:border-blue-500"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                      <Icon className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      {service.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link to="/servicii">
              <Button size="lg">
                Vezi toate serviciile
                <ChevronRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20 dark:bg-[#1a1a1a]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1759310610325-2c7cb621e5e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGhhbmRzaGFrZSUyMHRydXN0JTIwcGFydG5lcnNoaXB8ZW58MXx8fHwxNzczMDI3OTAyfDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Parteneriat"
                className="rounded-2xl shadow-xl"
              />
            </div>
            <div>
              <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white lg:text-4xl">
                De ce sa alegi consultanta financiara gratuita?
              </h2>
              <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
                Cred ca accesul la informatii financiare clare ar trebui sa fie simplu.
                De aceea, platforma pune accent pe explicatii usor de urmarit, consultatii
                prietenoase si recomandari adaptate situatiei fiecarui client.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start space-x-3">
                    <CheckCircle2
                      className="mt-1 flex-shrink-0 text-green-600 dark:text-green-400"
                      size={20}
                    />
                    <span className="text-gray-700 dark:text-gray-200">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/despre">
                  <Button size="lg" variant="outline">
                    Afla mai multe despre mine
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 dark:bg-[#0f0f0f]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white lg:text-4xl">
              Ce spun clientii
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              Feedback real de la oameni care si-au organizat mai bine planurile financiare
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="dark:border-gray-800 dark:bg-[#1a1a1a]">
                <CardContent className="p-6">
                  <div className="mb-4 flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={`${testimonial.name}-${i}`}
                        className="fill-yellow-400 text-yellow-400"
                        size={20}
                      />
                    ))}
                  </div>
                  <p className="mb-4 text-gray-600 dark:text-gray-300">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-blue-600 to-blue-800 py-20 text-white dark:from-blue-700 dark:to-blue-900">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 text-3xl font-bold lg:text-4xl">
            Pregatit sa iti organizezi mai bine planurile financiare?
          </h2>
          <p className="mb-8 text-xl text-blue-100">
            Creeaza un cont gratuit si programeaza o consultatie personalizata chiar astazi.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/inregistrare">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Creeaza cont gratuit
                <ChevronRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                Contacteaza-ma
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
