import { useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Googleapi from "./components/StickyInfo/Googleapi";
import Aapningstider from "./components/StickyInfo/Aapningstider";
import TacoHero from "./components/Tacohero";
import MenuAdmin from "./components/MenuAdmin";
import OrdersAdmin from "./components/OrdersAdmin";
import OrderMenu from "./components/OrderMenu";
import { ReactLenis, useLenis } from "lenis/react";
import Timeline from "./components/StickyInfo/Timeline";
type View = "home" | "menu" | "order" | "admin";

function App() {
  const [view, setView] = useState<View>("home");
  const [adminMode, setAdminMode] = useState<"landing" | "edit" | "orders">(
    "landing",
  );

  return (
    <ReactLenis root options={{lerp: 0.1, duration: 1.2, syncTouch: true}}>
      <div className="min-h-screen flex flex-col">
        <section id="Navbar">
          <Navbar view={view} setView={setView} />
        </section>  

        <main className="flex-grow">
          {view === "menu" && (
            <section id="Menu" className="p-4">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-4">Meny</h2>
                <div className="text-sm text-gray-600">
                  Se våre retter under Bestill (Bestill viser kun menyens
                  retter).
                </div>
              </div>
            </section>
          )}

          {view === "order" && (
            <section id="Order" className="p-4">
              <OrderMenu />
            </section>
          )}

          {view === "admin" && (
            <section id="Admin" className="p-4">
              {adminMode === "landing" && (
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                  <div className="text-lg font-semibold">Admin</div>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-forest text-white"
                      onClick={() => setAdminMode("edit")}
                    >
                      Edit menu
                    </button>
                    <button
                      className="px-4 py-2 bg-chili text-white"
                      onClick={() => setAdminMode("orders")}
                    >
                      Se bestillinger
                    </button>
                  </div>
                </div>
              )}

              {adminMode === "edit" && (
                <div className="max-w-3xl mx-auto">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-semibold">Edit Menu</div>
                    <div>
                      <button
                        className="px-3 py-1 mr-2"
                        onClick={() => setAdminMode("landing")}
                      >
                        Back
                      </button>
                      <button
                        className="px-3 py-1"
                        onClick={() => setView("home")}
                      >
                        Exit Admin
                      </button>
                    </div>
                  </div>
                  <MenuAdmin />
                </div>
              )}

              {adminMode === "orders" && (
                <div className="max-w-3xl mx-auto">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-semibold">Bestillinger</div>
                    <div>
                      <button
                        className="px-3 py-1 mr-2"
                        onClick={() => setAdminMode("landing")}
                      >
                        Back
                      </button>
                      <button
                        className="px-3 py-1"
                        onClick={() => setView("home")}
                      >
                        Exit Admin
                      </button>
                    </div>
                  </div>
                  <OrdersAdmin />
                </div>
              )}
            </section>
          )}
        </main>

        {view !== "admin" && view !== "order" && (
          <section id="Info">
            <div className="h-[5vh]"></div>
            <Timeline />
            <div className="h-screen"></div>

          </section>
        )}

        <section id="Footer">
          <Footer />
        </section>
      </div>
    </ReactLenis>
  );
}

export default App;
