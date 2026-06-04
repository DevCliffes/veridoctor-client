import LegalAccordion from "@/components/legalAccordion";

type Faq = {
  quiz: string;
  ans: string;
};
export default function Faq() {
  const faqs: Faq[] = [
    {
      quiz: "What is veri doctor?",
      ans: "Veri Doctor is a digital healthcare platform that allows patients to book appointments,\
                    consult with specialists virtually or in-person, and manage their health records seamlessly",
    },
    {
      quiz: "How do I book an appointment with a doctor on Veri Doctor?",
      ans: "Simply visit our website, search for your preferred doctor or specialist, and book an\
                appointment instantly through the platform.",
    },
    {
      quiz: "What services does Veri Doctor offer?",
      ans: "We offer virtual consultations, in-person consultations, and health records management.\
                    Our doctors cover specialties like General Medicine, Pediatrics, Dermatology,\
                    Gynecology-OB, and more.",
    },
    {
      quiz: "Are the doctors on Veri Doctor certified?",
      ans: "Yes, all doctors and specialists on Veri Doctor are vetted, verified, and fully licensed\
                professionals.",
    },
    {
      quiz: "Can I use Veri Doctor for both virtual and in-person consultations?",
      ans: "Absolutely! Veri Doctor supports both virtual consultations and in-person appointments,\
                    allowing flexibility depending on your needs.",
    },
    {
      quiz: "What do I need for a virtual consultation?",
      ans: "All you need is a device (smartphone, tablet, or computer) with internet access, and you're\
                ready to connect with a doctor from anywhere.",
    },
    {
      quiz: "How much does it cost to use Veri Doctor?",
      ans: "The cost varies based on the doctor or specialist you consult. Fees are clearly displayed\
                when booking an appointment.",
    },
    {
      quiz: "Can I consult a specialist through Veri Doctor?",
      ans: "Yes, you can consult specialists in various fields such as dermatology, gynecology,\
                pediatrics, and more",
    },
    {
      quiz: "Can I use insurance for consultations on Veri Doctor?",
      ans: "Yes, different doctors and specialists accept various insurance providers. You can check\
                which insurance is accepted when booking an appointment with your preferred doctor.",
    },
    {
      quiz: "Is Veri Doctor available outside Kenya?",
      ans: "Currently, Veri Doctor is focused on serving patients within Kenya, but we are planning to\
                expand our services in the future.",
    },
    {
      quiz: "How do I manage my health records on Veri Doctor?",
      ans: "Once registered, you can upload, store, and access your medical records securely through\
                    your profile on the Veri Doctor platform.",
    },
    {
      quiz: "What if I experience technical issues during a virtual consultation?",
      ans: "Our support team is available to assist you in case of any technical difficulties during\
                    consultations.",
    },
    {
      quiz: "How do I contact Veri Doctor customer support?",
      ans: "You can reach our customer support team via the contact details on our website",
    },
  ];
  return (
    <>
      <div className="flex flex-col  items-center mt-16 m-auto min-h-[80vh] px-8">
        <h1 className="text-3xl md:text-5xl font-extrabold">
          Frequently asked questions.
        </h1>
        <div className="lg:w-[70vw] mt-10">
          {faqs.map((faq, index) => (
            <LegalAccordion key={index} title={faq.quiz}>
              <p>{faq.ans}</p>
            </LegalAccordion>
          ))}
        </div>
      </div>
    </>
  );
}
