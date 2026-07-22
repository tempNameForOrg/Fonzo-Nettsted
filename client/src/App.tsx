import { useState } from "react"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"

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
        
      </section>
      <section id="Footer">
        <Footer></Footer>
      </section>
    </>
  )
}

export default App
