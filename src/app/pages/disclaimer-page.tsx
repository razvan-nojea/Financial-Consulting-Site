export function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm p-8 lg:p-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Disclaimer</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Ultima actualizare: 10 Martie 2026</p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <p className="text-yellow-800 font-medium">
              Vă rugăm să citiți cu atenție acest disclaimer înainte de a utiliza serviciile de
              consultanță financiară oferite de Răzvan-Ionuț Nojea.
            </p>
          </div>

          <div className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                1. Scop Informațional și Educațional
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Toate informațiile, sfaturile și recomandările furnizate prin această platformă și
                în cadrul consultațiilor sunt destinate exclusiv în scop educațional și
                informațional. Acestea nu constituie consiliere financiară profesională, juridică
                sau fiscală oficială.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                2. Nicio Garanție de Rezultate
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Deși oferim sfaturi bazate pe experiență și cunoștințe în domeniul financiar, nu
                garantăm și nu promitem rezultate financiare specifice. Performanțele financiare
                trecute nu garantează rezultate viitoare. Fiecare situație financiară este unică și
                rezultatele pot varia semnificativ de la o persoană la alta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                3. Responsabilitate Personală
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Decizia finală privind orice acțiune financiară vă aparține în totalitate.
                Răzvan-Ionuț Nojea nu este responsabil pentru deciziile dvs. financiare sau pentru
                rezultatele acestora. Vă recomandăm să efectuați propriile cercetări și să
                consultați profesioniști licențiați înainte de a lua decizii financiare majore.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                4. Riscuri Financiare
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed mb-3">
                Toate investițiile și deciziile financiare implică riscuri, inclusiv:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-400">
                <li>Riscul de pierdere a capitalului investit</li>
                <li>Fluctuații ale pieței financiare</li>
                <li>Modificări ale ratelor dobânzilor și inflației</li>
                <li>Schimbări legislative și fiscale</li>
                <li>Riscuri specifice fiecărui tip de investiție</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed mt-3">
                Nu investiți bani pe care nu vi-i puteți permite să îi pierdeți.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                5. Nu Suntem Consilieri Financiari Licențiați
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Deși oferim consultanță bazată pe experiență în domeniul financiar, această
                platformă și serviciile oferite nu reprezintă o licență oficială de consiliere
                financiară, fiscală sau juridică. Pentru sfaturi oficiale și personalizate, vă
                recomandăm să consultați:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-400 mt-3">
                <li>Consilieri financiari certificați</li>
                <li>Consultanți fiscali autorizați</li>
                <li>Avocați specializați în drept fiscal și financiar</li>
                <li>Contabili autorizați</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                6. Limitări de Răspundere
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                În măsura maximă permisă de lege, Răzvan-Ionuț Nojea nu va fi responsabil pentru
                niciun fel de pierderi, daune sau cheltuieli (directe sau indirecte) care rezultă
                din:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-400 mt-3">
                <li>Utilizarea sau imposibilitatea de a utiliza această platformă</li>
                <li>Decizii financiare bazate pe informațiile furnizate</li>
                <li>Erori sau omisiuni în conținut</li>
                <li>
                  Întreruperi sau indisponibilitatea temporară a platformei sau serviciilor
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                7. Acuratețea Informațiilor
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Deși depunem eforturi pentru a oferi informații corecte și actualizate, nu
                garantăm acuratețea, completitudinea sau utilitatea informațiilor furnizate.
                Informațiile pot fi modificate fără notificare prealabilă. Legile fiscale,
                reglementările financiare și condițiile pieței se pot schimba și pot afecta
                relevanța sfaturilor oferite.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                8. Link-uri către Terțe Părți
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Această platformă poate conține link-uri către site-uri web externe. Nu suntem
                responsabili pentru conținutul, politicile de confidențialitate sau practicile
                acestor site-uri terțe. Includem aceste link-uri doar pentru comoditate și nu
                implică o aprobare din partea noastră.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                9. Servicii Gratuite
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Toate serviciile oferite prin această platformă sunt complet gratuite. Nu existe
                costuri ascunse, taxe sau obligații financiare. Totuși, calitatea și
                disponibilitatea serviciilor gratuite pot fi limitate comparativ cu serviciile
                profesionale plătite.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                10. Modificări ale Disclaimer-ului
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Ne rezervăm dreptul de a modifica acest disclaimer în orice moment. Modificările
                vor fi publicate pe această pagină și vor intra în vigoare imediat. Este
                responsabilitatea dvs. să verificați periodic acest disclaimer pentru actualizări.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                11. Consultați Profesioniști
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Înainte de a lua orice decizie financiară importantă, vă sfătuim cu căldură să:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-400 mt-3">
                <li>Efectuați propriile cercetări</li>
                <li>Consultați profesioniști licențiați în domeniu</li>
                <li>Evaluați-vă propria situație financiară și toleranța la risc</li>
                <li>Citiți și înțelegeți documentele relevante înainte de a semna</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                12. Acceptarea Disclaimer-ului
              </h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed">
                Utilizând această platformă și serviciile oferite, confirmați că ați citit, înțeles
                și sunteți de acord cu termenii acestui disclaimer. Dacă nu sunteți de acord,
                vă rugăm să nu utilizați platforma sau serviciile oferite.
              </p>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg mt-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Contact</h2>
              <p className="text-gray-700 dark:text-gray-400 leading-relaxed mb-3">
                Pentru întrebări sau clarificări legate de acest disclaimer, vă rugăm să ne
                contactați:
              </p>
              <p className="text-gray-700 dark:text-gray-400">
                <strong>Email:</strong> razvan.nojea@consultanta.ro
                <br />
                <strong>Telefon:</strong> +40 123 456 789
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}