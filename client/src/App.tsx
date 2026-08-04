import { useState } from "react"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Googleapi from "./components/Googleapi"
import Aapningstider from "./components/Aapningstider"
import TacoHero from "./components/Tacohero"
import MenuAdmin from "./components/MenuAdmin"

type View = "home" | "menu" | "order" | "admin"

function App() {
  const [view, setView] = useState<View>("home")
  const [adminMode, setAdminMode] = useState<'landing' | 'edit'>('landing')

  return (
    <>
      <section id="Navbar">
        <Navbar view={view} setView={setView} />
      </section>

      <main>
        {view === "home" && (
          <section id="Hero">
            <div className="color-olive py-5 my-5 bg-cream">
              <div className="flex flex-col items-center">
                <TacoHero />
              </div>
            </div>
          </section>
        )}

        {view === "menu" && (
          <section id="Menu">
            <div className="p-4">Menu view (TODO)</div>
          </section>
        )}

        {view === "order" && (
          <section id="Order">
            <div className="p-4">Order view (TODO)</div>
          </section>
        )}

        {view === "admin" && (
          <section id="Admin" className="p-4">
            {adminMode === 'landing' && (
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="text-lg font-semibold">Admin</div>
                <button className="px-4 py-2 bg-forest text-white" onClick={() => setAdminMode('edit')}>Edit menu</button>
              </div>
            )}

            {adminMode === 'edit' && (
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-lg font-semibold">Edit Menu</div>
                  <div>
                    <button className="px-3 py-1 mr-2" onClick={() => setAdminMode('landing')}>Back</button>
                    <button className="px-3 py-1" onClick={() => setView('home')}>Exit Admin</button>
                  </div>
                </div>
                <MenuAdmin />
              </div>
            )}
          </section>
        )}
      </main>

      {view !== 'admin' && (
        <>
          <section id="Info">
            <Aapningstider />
            <Googleapi />
          </section>
          <section id="Footer">
            <Footer />
          </section>
        </>
      )}
    </>
  )
}

export default App
