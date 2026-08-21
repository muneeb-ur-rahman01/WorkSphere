import React from "react";
import osama from "../../assets/Images/Osama.jpeg";
import Rizwan from "../../assets/Images/Rizwan.jpeg";
import Sharjeel from "../../assets/Images/Sharjeel.png";
import Alishba from "../../assets/Images/Alishba.jpeg";
import Afrah from "../../assets/Images/Afrah.jpg";
import Muneeb from "../../assets/Images/Muneeb.jpeg"

function Team() {
  const founders = [
    { name: "Afrah Sadia", role: "Founder", img: Afrah },
    { name: "Alishba Noor", role: "Co-Founder", img: Alishba },
  ];

  const team = [
    {
      name: "Usama Bin Zahid",
      role: "Content Creator | Operational Team Member",
      img: osama,
    },
    {
      name: "Muhammad Rizwan",
      role: "Operation Team Member",
      img: Rizwan,
    },
    {
      name: "Sharjeel",
      role: "Operation Team Member",
      img: Sharjeel,
    },
     {
      name: "M Muneeb Ur Rahman Shahzad",
      role: "Head Of IT Department",
      img: Muneeb,
    },
  ];

  return (
    <section className="py-20 px-[5%] bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-[2.4rem] font-extrabold text-black mb-3">
            Executive Directors
          </h2>

          <p className="text-base text-[var(--text-secondary)]">
            Meet the visionaries behind our organization
          </p>
        </div>

        {/* Founders */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">

          {founders.map((person, index) => (
            <div
              key={index}
              className="bg-slate-50 border border-gray-200 rounded-[20px] p-[35px] text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
            >
              <img
                src={person.img}
                alt={person.name}
                className="w-[150px] h-[150px] object-cover rounded-full mx-auto mb-5 border-4 border-white shadow-md"
              />

              <h3 className="text-[1.6rem] font-bold text-gray-900">
                {person.name}
              </h3>

              <p className="text-blue-600 mt-2 font-medium">
                {person.role}
              </p>
            </div>
          ))}

        </div>

        {/* Team Members */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {team.map((member, index) => (
            <div
              key={index}
              className="bg-slate-50 border border-gray-200 rounded-[20px] p-[30px] text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
            >
              <img
                src={member.img}
                alt={member.name}
                className="w-[120px] h-[120px] object-cover rounded-full mx-auto mb-5 border-4 border-white shadow-md"
              />

              <h3 className="text-[1.3rem] font-bold text-gray-900">
                {member.name}
              </h3>

              <p className="mt-3 text-gray-500 leading-7">
                {member.role}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}

export default Team;