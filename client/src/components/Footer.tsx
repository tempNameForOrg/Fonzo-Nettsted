import React from "react";

const Footer = () => {
  return (
    <>
      <footer className="bg-forest flex flex-row items-center justify-center mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex-1 py-5 px-auto text-cream">
          <h1 className="lg:text-9xl sm:text-6xl text-5xl ">Fonzo Tacos</h1>
        </div>
        <div className="flex-1 text-right py-5 px-auto text-cream">
          <h1 className="lg:text-6xl sm:text-3xl text-2xl">Kontakt oss:</h1>
          <p className="text-xl hover: marigold">+47 41 35 96 37</p>
        </div>
      </footer>
      <div className="bg-forest flex flex-row items-center justify-center mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">Feil med Siden? <a href="mailto:adrian.balunan237426@gmail.com">Gjerne send en mail!</a></div>
      </div>
    </>
  );
};

export default Footer;
