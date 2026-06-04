import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@veridoctor/design/components";

type Faq = {
  quiz: string;
  ans: string;
};
export default function AccordionEl() {
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
  ];

  return (
    <Accordion
      className="w-[90vw] m-auto px-4 md:w-[70vw] lg:max-w-[900px] border-2 shadow rounded-lg"
      type="single"
      defaultValue="0"
      collapsible
    >
      {faqs.map((faq, index) => (
        <AccordionItem
          className="AccordionItem border-b-2"
          key={index}
          value={index.toString()}
        >
          <div className="font-bold text-lg">
            <AccordionTrigger className="cursor-pointer font-bold">
              {faq.quiz}
            </AccordionTrigger>
          </div>
          <AccordionContent>{faq.ans}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
