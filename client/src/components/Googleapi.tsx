import React from "react";

const Googleapi = () => {
  return (
    <>
      <div className="color-olive py-5 my-5">
        <div className="flex flex-col items-center">
            {/*Google API container*/}
            <div className="w-full border max-w-3xl aspect-video overflow-hidden rounded-xl">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d8044.189362432893!2d10.193266423638022!3d59.73203271727976!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x46413d0019a4a56b%3A0xa98f09ff02190a46!2zRm9uem_igJlzIFRhY29z!5e0!3m2!1sno!2sno!4v1784729781173!5m2!1sno!2sno"
                    className="w-full h-full object-cover"
                    allow="fullscreen"
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                ></iframe>
          </div>
        </div>
      </div>
    </>
  );
};

export default Googleapi;
