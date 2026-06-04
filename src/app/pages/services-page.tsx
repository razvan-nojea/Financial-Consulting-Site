import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  TrendingUp,
  PiggyBank,
  Calculator,
  LineChart,
  Home,
  Briefcase,
  GraduationCap,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function ServicesPage() {
  const services = [
    {
      icon: TrendingUp,
      title: "Planificare Financiară Personală",
      description:
        "Dezvoltăm împreună o strategie financiară completă, adaptată obiectivelor tale de viață.",
      forWho: "Pentru oricine dorește să își îmbunătățească situația financiară",
      benefits: [
        "Analiză completă a situației financiare actuale",
        "Stabilirea obiectivelor financiare pe termen scurt și lung",
        "Plan de acțiune personalizat",
        "Monitorizare și ajustări periodice",
      ],
    },
    {
      icon: PiggyBank,
      title: "Planificare Pensie",
      description:
        "Asigură-ți un viitor financiar confortabil cu strategii de economisire și investiții pentru pensie.",
      forWho: "Pentru persoane de orice vârstă care vor să își planifice pensia",
      benefits: [
        "Calcularea sumelor necesare pentru pensia dorită",
        "Strategii de economisire și investiții pentru pensie",
        "Optimizarea contribuțiilor la fonduri de pensii",
        "Planificare fiscală pentru pensionari",
      ],
    },
    {
      icon: Calculator,
      title: "Gestionarea Datoriilor",
      description:
        "Strategii eficiente pentru reducerea și eliminarea datoriilor, recuperarea controlului financiar.",
      forWho: "Pentru cei care se confruntă cu datorii și vor să le reducă",
      benefits: [
        "Analiza tuturor datoriilor existente",
        "Planuri personalizate de rambursare",
        "Strategii de consolidare a datoriilor",
        "Sfaturi pentru evitarea datoriilor în viitor",
      ],
    },
    {
      icon: LineChart,
      title: "Strategii de Investiții",
      description:
        "Consultanță pentru creșterea averii prin investiții inteligente și diversificate.",
      forWho: "Pentru investitori începători și intermediari",
      benefits: [
        "Evaluarea profilului de risc",
        "Recomandări de portofoliu diversificat",
        "Educație despre diferite tipuri de investiții",
        "Strategii de maximizare a randamentelor",
      ],
    },
    {
      icon: Home,
      title: "Planificare Imobiliară",
      description: "Ghidare în deciziile legate de achiziția de proprietăți și investiții imobiliare.",
      forWho: "Pentru cei care vor să cumpere o casă sau să investească în imobiliare",
      benefits: [
        "Calcularea capacității de creditare",
        "Compararea ofertelor de credite ipotecare",
        "Strategii de economisire pentru avansul casei",
        "Analiza investițiilor imobiliare",
      ],
    },
    {
      icon: Briefcase,
      title: "Consultanță Financiară pentru Afaceri",
      description: "Suport pentru antreprenori și proprietari de afaceri mici în gestionarea finanțelor.",
      forWho: "Pentru antreprenori și proprietari de afaceri mici",
      benefits: [
        "Planificare financiară pentru afaceri",
        "Gestionarea fluxului de numerar",
        "Strategii de creștere și expansiune",
        "Optimizare fiscală pentru afaceri",
      ],
    },
    {
      icon: GraduationCap,
      title: "Planificare Educație Copii",
      description: "Strategii de economisire pentru educația copiilor și viitorul lor.",
      forWho: "Pentru părinți care vor să economisească pentru educația copiilor",
      benefits: [
        "Estimarea costurilor educației viitoare",
        "Planuri de economisire pentru studii",
        "Investiții dedicate educației",
        "Sfaturi despre burse și ajutoare financiare",
      ],
    },
    {
      icon: Heart,
      title: "Coaching Bugetar",
      description: "Învață să îți gestionezi banii eficient și să creezi un buget sustenabil.",
      forWho: "Pentru oricine dorește să își îmbunătățească abilitățile de gestionare a banilor",
      benefits: [
        "Crearea unui buget personalizat",
        "Identificarea și eliminarea cheltuielilor inutile",
        "Tehnici de economisire eficiente",
        "Formarea obiceiurilor financiare sănătoase",
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">Serviciile Mele</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Consultanță financiară completă și gratuită pentru toate aspectele vieții tale
              financiare
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="border-2 dark:bg-[#1a1a1a] dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="text-blue-600 dark:text-blue-400" size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                          {service.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">{service.description}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">
                        {service.forWho}
                      </p>
                      <ul className="space-y-2">
                        {service.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <CheckCircle2
                              className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                              size={18}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gray-50 dark:bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Cum Funcționează Procesul de Consultanță
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Un proces simplu și transparent pentru a te ajuta să îți atingi obiectivele financiare
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Creează Cont",
                description: "Înregistrează-te gratuit pe platformă și completează profilul tău.",
              },
              {
                step: "2",
                title: "Programează Consultanță",
                description: "Alege o dată convenabilă din calendarul meu de disponibilități.",
              },
              {
                step: "3",
                title: "Consultanță Inițială",
                description: "Discutăm situația ta financiară și obiectivele tale.",
              },
              {
                step: "4",
                title: "Plan Personalizat",
                description: "Primești un plan de acțiune adaptat nevoilor tale specifice.",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image Section */}
      <section className="py-20 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                De Ce Este Consultanța Gratuită?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Cred cu tărie că educația și consultanța financiară ar trebui să fie accesibile
                tuturor, nu doar celor cu venituri mari. Oferind servicii gratuite, pot ajuta mai
                mulți oameni să își îmbunătățească viața financiară.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Satisfacția mea vine din a vedea clienții mei reușind să își atingă obiectivele -
                fie că este vorba despre reducerea datoriilor, economisirea pentru pensie sau
                investirea inteligent.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Nu există costuri ascunse, nu există obligații. Doar sfaturi oneste și
                personalizate pentru a te ajuta să iei decizii financiare mai bune.
              </p>
            </div>
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758518728641-8668e601cce1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjBwbGFubmluZyUyMGNoYXJ0cyUyMGdyb3d0aHxlbnwxfHx8fDE3NzMxMzExNDJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Financial Planning"
                className="rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Pregătit Să Începi?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Creează un cont gratuit și programează prima ta consultanță astăzi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/inregistrare">
              <Button size="lg" variant="secondary">
                Creează Cont Gratuit
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Contactează-mă Întâi
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}