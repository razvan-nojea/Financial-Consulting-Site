import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the message
    toast.success("Mesajul a fost trimis cu succes! Vă voi contacta în curând.");
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "razvan.nojea@consultanta.ro",
      description: "Răspund în maxim 24 de ore",
    },
    {
      icon: Phone,
      title: "Telefon",
      value: "+40 123 456 789",
      description: "Luni - Vineri, 9:00 - 18:00",
    },
    {
      icon: MapPin,
      title: "Locație",
      value: "București, România",
      description: "Consultanță online disponibilă",
    },
    {
      icon: Clock,
      title: "Program",
      value: "Luni - Vineri",
      description: "9:00 - 18:00",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">Contactează-mă</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Ai întrebări despre serviciile mele? Vreau să programezi o consultanță? Sunt aici să
              te ajut!
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-20 bg-gray-50 dark:bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <Card key={index} className="dark:bg-[#1a1a1a] dark:border-gray-800">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{info.title}</h3>
                    <p className="text-gray-900 dark:text-white mb-1">{info.value}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{info.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Contact Form */}
          <div className="max-w-3xl mx-auto">
            <Card className="dark:bg-[#1a1a1a] dark:border-gray-800">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Trimite-mi un Mesaj</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Nume Complet *</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Numele tău"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="email@exemplu.ro"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+40 123 456 789"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subiect *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Despre ce vrei să discutăm?"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">Mesaj *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Descrie situația ta sau întrebările tale..."
                      rows={6}
                      className="mt-2"
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Trimite Mesajul
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white dark:bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Întrebări Frecvente
          </h2>
          <div className="space-y-6">
            {[
              {
                question: "Cât durează o consultanță?",
                answer:
                  "O consultanță inițială durează de obicei între 60-90 de minute. Consultările ulterioare pot fi mai scurte, în funcție de nevoile tale.",
              },
              {
                question: "Cum se desfășoară consultanțele?",
                answer:
                  "Consultanțele se pot desfășura online (video call) sau față în față, în funcție de preferințele tale și disponibilitate.",
              },
              {
                question: "Este cu adevărat gratuit?",
                answer:
                  "Da, toate consultările și serviciile mele sunt complet gratuite. Nu există costuri ascunse sau obligații financiare.",
              },
              {
                question: "Ce informații ar trebui să pregătesc pentru consultanță?",
                answer:
                  "Ar fi util să ai o imagine de ansamblu asupra veniturilor, cheltuielilor, datoriilor și obiectivelor tale financiare. Voi oferi un chestionar înainte de întâlnire.",
              },
              {
                question: "Cât de repede pot programa o consultanță?",
                answer:
                  "De obicei, pot programa o consultanță în următoarele 3-7 zile. Pentru urgențe, încerc să găsesc un slot mai devreme.",
              },
            ].map((faq, index) => (
              <Card key={index} className="dark:bg-[#1a1a1a] dark:border-gray-800">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}