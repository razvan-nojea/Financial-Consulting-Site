import { Card, CardContent } from "../components/ui/card";
import { Award, Users, TrendingUp, Heart, Shield } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";

export function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: "Dedicare",
      description: "Mă dedic în totalitate succesului financiar al clienților mei.",
    },
    {
      icon: Shield,
      title: "Integritate",
      description: "Transparență și onestitate în toate recomandările financiare.",
    },
    {
      icon: Users,
      title: "Orientare către Client",
      description: "Fiecare plan este personalizat pentru nevoile unice ale fiecărui client.",
    },
    {
      icon: TrendingUp,
      title: "Rezultate",
      description: "Focalizat pe rezultate măsurabile și obiective concrete.",
    },
  ];

  const qualifications = [
    "Licență în Finanțe și Banking",
    "Certificare în Planificare Financiară Personală",
    "10+ ani experiență în consultanță financiară",
    "Specializare în strategii de investiții",
    "Expert în planificare pensie și fiscalitate",
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">Despre Mine</h1>
            <p className="text-xl text-blue-100 dark:text-blue-200 max-w-3xl mx-auto">
              Pasionat de a ajuta oamenii să își atingă obiectivele financiare și să construiască
              un viitor sigur
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="w-full h-96 bg-gray-200 dark:bg-[#1a1a1a] rounded-2xl shadow-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-4xl">RN</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Răzvan-Ionuț Nojea</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Consultant Financiar</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Răzvan-Ionuț Nojea
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Bună! Sunt Răzvan, consultant financiar cu peste 10 ani de experiență în domeniu.
                Pasiunea mea este să ajut oamenii să își înțeleagă mai bine finanțele personale și
                să ia decizii informate pentru viitorul lor.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Am decis să ofer consultanță gratuită deoarece cred că toată lumea merită acces la
                sfaturi financiare de calitate, indiferent de situația lor economică actuală.
                Educația financiară ar trebui să fie accesibilă tuturor, nu doar celor care își
                permit să plătească pentru aceasta.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                De-a lungul carierei mele, am ajutat sute de clienți să își reducă datoriile, să
                își crească economiile, să investească inteligent și să își planifice pensia.
                Fiecare succes al clienților mei este și succesul meu.
              </p>
            </div>
          </div>

          {/* Qualifications */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Calificări și Experiență
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {qualifications.map((qual, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-[#1a1a1a] rounded-lg"
                >
                  <Award className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-800 dark:text-gray-300">{qual}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Values */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Valorile Mele
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card key={index}>
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="text-blue-600 dark:text-blue-300" size={28} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {value.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">{value.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-gray-50 dark:bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Filosofia Mea Despre Bani
          </h2>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 shadow-lg">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Cred că banii sunt un instrument, nu un scop în sine. Ei ar trebui să vă servească
              pe dvs. și valorile voastre, nu invers. O planificare financiară bună nu înseamnă
              doar să acumulezi avere - înseamnă să creezi libertate, oportunități și liniște
              sufletească.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Fiecare persoană are o relație unică cu banii, influențată de experiențele,
              valorile și obiectivele sale. De aceea, nu există o soluție universală. Abordarea
              mea este să ascult mai întâi, să înțeleg situația dvs. specifică, și apoi să creez
              un plan personalizat care funcționează pentru dvs.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Educația financiară este putere. Cu informațiile și instrumentele potrivite,
              oricine poate lua decizii financiare mai bune și poate construi un viitor mai
              sigur.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Hai Să Lucrăm Împreună
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Dacă ești pregătit să îți transformi viitorul financiar, sunt aici să te ajut.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/inregistrare">
              <Button size="lg">Creează Cont Gratuit</Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline">
                Contactează-mă
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}