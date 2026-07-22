import React from "react";

const Footer = () => {
  return (
    <>
      <footer className="bg-forest ">
        <div className=" mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo area */}
            <div className="text-cream">
              <h1 className="lg:text-6xl sm:text-5xl text-4xl font-bold tracking-tight">
                Fonzo Tacos
              </h1>
              <p className="mt-2 text-sm text-cream/70">Byens Beste</p>
            </div>

            {/* Contact*/}
            <address className="non-italic sm:text-right text-cream">
              <h1 className="sm:text-xl text-lg font-semibold text-marigold">
                Kontakt oss:
              </h1>
              <div className="mt-2">
                <a href="tel:4741359637">+47 41 35 96 37</a>
              </div>
            </address>
          </div>
          {/* "Feil med siden" */}
          <div className="mot-8 border-t border-cream/20 mt-8">
            <div className="py-1 flex flex-row justify-center items-center gap-2 text-center text-sm text-cream/70 sm:flex-row">
              Feil med Siden?
              <a
                href="mailto:adrian.balunan237426@gmail.com"
                className="text-cream hover:text-marigold underline underline-offset-2 transition-colors"
              >
                Gjerne send en mail!
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
