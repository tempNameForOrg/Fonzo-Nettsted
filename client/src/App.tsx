import { useState } from "react"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Googleapi from "./components/Googleapi"
import Aapningstider from "./components/Aapningstider"
import TacoHero from "./components/Tacohero"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="Navbar">
        <Navbar></Navbar>
      </section>
      <section id="Hero">
      <div className="color-olive py-5 my-5 bg-cream">
        <div className="flex flex-col items-center">
         <TacoHero></TacoHero>
        </div>
        </div>
        
      </section>
      <section id="Info">
        <Aapningstider></Aapningstider>
        <Googleapi></Googleapi>
      </section>
      <section id="Footer">
        <Footer></Footer>
      </section>
    </>
  )
}

export default App
