import Image from "next/image";

export default function About() {
  return (
    <div className="flex flex-col px-4 max-w-5xl mx-auto py-12 gap-16">

      {/* Hero */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="max-w-[500px]">
          <h1 className="text-3xl lg:text-5xl font-extrabold leading-tight">
            About
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            At Veri Doctor, we&apos;re committed to making healthcare more
            accessible, efficient, and impactful. We&apos;re creating a future
            where everyone can access quality care, regardless of where they are.
          </p>
        </div>
        <Image
          alt="a doctor holding a phone"
          height={400}
          width={500}
          className="block max-w-[100%] rounded-xl"
          src="/signup-image.png"
        />
      </div>

      {/* Mission */}
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <h2 className="font-extrabold text-2xl lg:text-4xl shrink-0">Our mission</h2>
        <p className="max-w-[500px] text-lg text-gray-600">
          To ensure patients and healthcare providers benefit from innovative,
          accessible, and efficient healthcare solutions.
        </p>
      </div>

      {/* What we offer */}
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="font-extrabold text-2xl lg:text-4xl">What we offer</h2>
          <p className="mt-2 text-lg text-gray-600 max-w-[700px]">
            Veri Doctor provides a seamless experience for patients seeking
            medical consultations, whether for routine check-ups, follow-up
            appointments, or specialized care.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {[
            {
              title: "Verified doctors",
              desc: "Each medical professional on our platform is thoroughly vetted and certified, ensuring that patients receive the highest standard of care.",
            },
            {
              title: "Telehealth",
              desc: "Access medical consultations from the comfort of your home, reducing the need for in-person visits and making healthcare more accessible.",
            },
            {
              title: "Health Records Management",
              desc: "Securely manage and access your medical records, ensuring that your health information is always up-to-date and readily available.",
            },
            {
              title: "Instant Appointments",
              desc: "Patients can easily book consultations with doctors, reducing wait times and eliminating the need for travel.",
            },
            {
              title: "Accessible Healthcare",
              desc: "Whether you're in a remote area or in the city, Veri Doctor brings healthcare to your fingertips, making it easier to access medical expertise.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border border-gray-100 shadow-sm rounded-xl p-5"
            >
              <p className="font-bold text-lg text-blue-500 mb-2">{item.title}</p>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Our Story */}
      <div className="flex flex-col md:flex-row justify-between gap-6 pb-8">
        <h2 className="font-extrabold text-2xl lg:text-4xl shrink-0">Our Story</h2>
        <p className="max-w-[500px] text-lg text-gray-600">
          Veri Doctor was founded with a clear vision: to address the challenges
          faced by patients and healthcare providers in accessing and delivering
          quality care. With technology as our backbone, we&apos;ve created a
          platform that empowers users, simplifies healthcare journeys, and
          bridges the gap between patients and providers.
        </p>
      </div>

    </div>
  );
}

