import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/layout/Reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const QUESTIONS = [
  {
    q: "Apa itu SELARAS?",
    a: "SELARAS adalah lapisan integritas pelayanan: bukti dibentuk sejak titik pelayanan, dikumpulkan dalam Service Passport, episode direkonstruksi, lalu dicocokkan dengan billing dan klaim. Bukan mesin vonis fraud, bukan pengganti RME/SIMRS, bukan sistem klaim baru.",
  },
  {
    q: "Apa itu Service Passport?",
    a: "Service Passport adalah bundel bukti untuk satu episode pelayanan: identitas layanan, daftar evidence, coverage, status, dan tautan untuk memutar ulang episode. Ia menjadi jembatan antara apa yang terjadi di lapangan dan apa yang tertera pada klaim.",
  },
  {
    q: "Apakah AI memutuskan klaim?",
    a: "Tidak. AI Evidence Reasoner hanya menjelaskan: apa yang ditemukan, kapan, dari bukti mana, celah apa yang ada, dan mengapa kasus itu perlu direview. Keputusan review selalu berada pada aktor manusia.",
  },
  {
    q: "Apakah SELARAS menggantikan RME/SIMRS?",
    a: "Tidak. SELARAS membaca jejak pelayanan yang sudah terjadi di sistem yang ada, lalu merekonstruksinya menjadi bukti yang bisa ditelusuri. Ia bekerja di atas, bukan menggantikan.",
  },
  {
    q: "Data apa yang digunakan pada halaman ini?",
    a: "Seluruh contoh pada halaman ini adalah Synthetic Demonstration. Tidak ada data peserta JKN riil, tidak ada fasilitas kesehatan nyata, dan tidak ada angka klaim yang diverifikasi.",
  },
  {
    q: "Apa fokus MVP dan rencana pengembangan?",
    a: "MVP berfokus pada integritas pelayanan fisioterapi dengan sasaran utama phantom dan repeat billing. Service line lain seperti radiologi, laboratorium, farmasi, alat kesehatan, dan rawat inap masuk sebagai roadmap dengan pola fingerprint yang sama.",
  },
];

export function FAQSection() {
  return (
    <section
      aria-labelledby="faq-title"
      className="border-t border-hairline bg-ivory py-20 lg:py-28"
    >
      <div className="mx-auto grid max-w-[88rem] gap-8 px-5 lg:grid-cols-12 lg:gap-14 lg:px-8">
        <div className="lg:col-span-4">
          <SectionHeading
            id="faq-title"
            title="Questions worth asking."
            lead="Jawaban singkat untuk pertanyaan yang paling sering muncul saat demo."
            size="md"
          />
        </div>

        <Reveal className="lg:col-span-8" y={20}>
          <Accordion type="single" collapsible className="w-full">
            {QUESTIONS.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={`faq-${index}`}
                className="border-hairline"
              >
                <AccordionTrigger className="py-5 text-left text-base leading-snug text-ink hover:no-underline sm:text-lg">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="max-w-[62ch] pb-6 text-sm leading-relaxed text-ash sm:text-base">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
