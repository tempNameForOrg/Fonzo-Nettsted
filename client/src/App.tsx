import { useState } from "react"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Googleapi from "./components/Googleapi"
import Aapningstider from "./components/Aapningstider"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="Navbar">
        <Navbar></Navbar>
      </section>
      <section id="Hero">
        
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
