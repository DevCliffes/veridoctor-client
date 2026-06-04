import Image from "next/image";

export default function About() {
  return (
    <>
      <>
        <div className="flex lg:mt-8 items-center flex-col px-4">
          {/* <h1 className="text-blue-500 text-4xl lg:text-6xl font-extrabold mb-4">ABOUT</h1> */}
          <div className="flex flex-col lg:flex-row w-full items-center justify-evenly gap-6 h-screen lg:h-full lg:min-h-[85vh] my-8">
            <div>
              <h1 className="text-2xl lg:text-5xl font-extrabold max-w-[600px] leading-10 lg:leading-[4rem]">
                About
              </h1>
              <p className="mt-4 max-w-[500px] text-xl">
                At Veri Doctor, we&apos;re committed to making healthcare more
                accessible, efficient, and impactful. We&apos;re creating a
                future where everyone can access quality care, regardless of
                where they are.
              </p>
            </div>
            <Image
              alt="a doctor holding a phone"
              height={400}
              width={500}
              className="block max-w-[100%]"
              src="/signup-image.png"
            ></Image>
          </div>
          <div className="w-full flex flex-col md:flex-row lg:flex-row justify-evenly mt-6 lg:mt-24 gap-6">
            <h1 className="font-extrabold text-2xl lg:text-5xl">Our mission</h1>
            <p className="max-w-[500px] text-xl">
              To ensure patients and healthcare providers benefit from
              innovative, accessible, and efficient healthcare solutions.
            </p>
          </div>
          <div className="grid my-8 lg:my-16 grid-cols-2 lg:grid-cols-4 gap-3">
            {/* <img src="doctor_about.jpg" className="w-[250px] md:w-[300px] rounded-xl"></img>
                        <img src="doctor_about.jpg" className="w-[250px] md:w-[300px] rounded-xl"></img>
                        <img src="doctor_about.jpg" className="w-[250px] md:w-[300px] rounded-xl"></img>
                        <img src="doctor_about.jpg" className="w-[250px] md:w-[300px] rounded-xl"></img> */}
          </div>
          <div className="flex flex-col items-center">
            <h1 className="font-extrabold text-2xl">What we offer</h1>
            <p className="mb-8 text-xl max-w-[800px]">
              Veri Doctor provides a seamless experience for patients seeking
              medical consultations, whether for routine check-ups, follow-up
              appointments, or specialized care. What is in for you:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* TODO: use cards  here for the sections below */}
              <div className="border-[1px] border-gray-100 shadow-lg w-[300px] min-h-[250px] rounded-lg pb-8">
                {/* <img src="doctor_about.jpg" className="h-[200px] w-full rounded-t-lg"></img> */}
                <div className="p-4">
                  <p className="font-bold text-xl text-blue-500">
                    Verified doctors
                  </p>
                  <p>
                    Each medical professional on our platform is thoroughly
                    vetted and certified, ensuring that patients receive the
                    highest standard of care.
                  </p>
                </div>
              </div>
              <div className="border-[1px] border-gray-100 shadow-lg w-[300px] min-h-[250px] rounded-lg pb-8">
                {/* <img src="doctor_about.jpg" className="h-[200px] w-full rounded-t-lg"></img> */}
                <div className="p-4">
                  <p className="font-bold text-xl text-blue-500">Telehealth</p>
                  <p>
                    Access medical consultations from the comfort of your home,
                    reducing the need for in-person visits and making healthcare
                    more accessible.
                  </p>
                </div>
              </div>
              <div className="border-[1px] border-gray-100 shadow-lg w-[300px] min-h-[250px] rounded-lg pb-8">
                {/* <img src="doctor_about.jpg" className="h-[200px] w-full rounded-t-lg"></img> */}
                <div className="p-4">
                  <p className="font-bold text-xl text-blue-500">
                    Health Records Management
                  </p>
                  <p>
                    Securely manage and access your medical records, ensuring
                    that your health information is always up-to-date and
                    readily available.
                  </p>
                </div>
              </div>
              <div className="border-[1px] border-gray-100 shadow-lg w-[300px] min-h-[250px] rounded-lg pb-8">
                {/* <img src="doctor_about.jpg" className="h-[200px] w-full rounded-t-lg"></img> */}
                <div className="p-4">
                  <p className="font-bold text-xl text-blue-500">
                    Instant Appointments
                  </p>
                  <p>
                    Patients can easily book consultations with doctors,
                    reducing wait times and eliminating the need for travel.
                  </p>
                </div>
              </div>
              <div className="border-[1px] border-gray-100 shadow-lg w-[300px] min-h-[250px] rounded-lg pb-8">
                {/* <img src="doctor_about.jpg" className="h-[200px] w-full rounded-t-lg"></img> */}
                <div className="p-4">
                  <p className="font-bold text-xl text-blue-500">
                    Accessible Healthcare
                  </p>
                  <p>
                    Whether you&apos;re in a remote area or in the city, Veri
                    Doctor brings healthcare to your fingertips, making it
                    easier to access medical expertise.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col md:flex-row justify-evenly mt-6 lg:mt-24 gap-6">
            <h1 className="font-extrabold text-2xl lg:text-5xl">Our Story</h1>
            <p className="max-w-[500px] text-xl">
              Veri Doctor was founded with a clear vision: to address the
              challenges faced by patients and healthcare providers in accessing
              and delivering quality care. With technology as our backbone,
              we&apos;ve created a platform that empowers users, simplifies
              healthcare journeys, and bridges the gap between patients and
              providers.
            </p>
          </div>
        </div>
      </>
    </>
  );
}
