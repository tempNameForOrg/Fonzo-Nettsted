import React from "react";

const Aapningstider = () => {
  return (
    <>
      <div className="relative h-[200vh]">
        <div className="sticky top-0 h-screen color-olive flex flex-col items-center">
          <div className="flex my-5 items-center justify-center pointer-events-none">
            <h1 className="text-center text-center text-6xl font-bold text-forest">
              Når åpner vi?
            </h1>
          </div>
          <div className="rounded-lg border border-black bg-cream p-6 shadow-lg">
            <div className="flex flex-col bg-cream text-center">
              <h2 className="text-black text-2xl font-bold">Åpningsstider</h2>
              <p className="text-black italic text-md">
                Tider gyldlig til XX/XX/XXXX
              </p>
              {/* Åpningstider */}
              <div className="mt-5 w-100">
                <div className="border-t border-black px-5 py-2 flex flex-row justify-between items-center">
                  <h2 className="text-black font-semibold">Mandag</h2>
                  <p className="text-black italiic">12:00 - 20:00</p>
                </div>
                <div className="border-t border-black px-5 py-2 flex flex-row justify-between items-center">
                  <h2 className="text-black font-semibold">Tirsdag</h2>
                  <p className="text-black italiic">12:00 - 20:00</p>
                </div>{" "}
                <div className="border-t border-black px-5 py-3 flex flex-row justify-between items-center">
                  <h2 className="text-black font-semibold">Onsdag</h2>
                  <p className="text-black italiic">12:00 - 20:00</p>
                </div>{" "}
                <div className="border-t border-black px-5 py-3 flex flex-row justify-between items-center">
                  <h2 className="text-black font-semibold">Torsdag</h2>
                  <p className="text-black italiic">12:00 - 20:00</p>
                </div>
                <div className="border-t border-black px-5 py-3 flex flex-row justify-between items-center">
                  <h2 className="text-black font-semibold">Fredag</h2>
                  <p className="text-black italiic">12:00 - 20:00</p>
                </div>
                <div className="border-t border-black px-5 py-3 flex flex-row justify-between items-center">
                  <h2 className="text-black font-semibold">Lørdag</h2>
                  <p className="text-black italiic">12:00 - 19:00</p>
                </div>{" "}
                <div className="border-t border-black px-5 py-3 flex flex-row justify-between items-center">
                  <h2 className="text-black font-semibold">Søndag</h2>
                  <p className="text-black italiic">13:00 - 19:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Aapningstider;
