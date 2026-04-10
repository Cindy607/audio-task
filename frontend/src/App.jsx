import { useState } from "react"
import "./App.css"

function App() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!file) {
      setError("pick a file first")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    const form = new FormData()
    form.append("file", file)

    try {
      const res = await fetch("http://127.0.0.1:8000/encode-audio", {
        method: "POST",
        body: form
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      console.error(err)
      setError("something went wrong, check the console")
    }

    setLoading(false)
  }

  return (
    <div className="wrapper">
      <h2>Audio Task</h2>
      <p>upload audio → server a encodes → server b decodes → saves as wav</p>

      <input
        type="file"
        accept="audio/*"
        onChange={e => setFile(e.target.files[0])}
      />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "processing..." : "send"}
      </button>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <p><b>file:</b> {result.file}</p>
          <p><b>codes shape:</b> {result.codes_shape}</p>
          <p><b>saved as:</b> {result.server_b?.saved}</p>
          <p><b>duration:</b> {result.server_b?.duration_sec}s</p>
        </div>
      )}
    </div>
  )
}

export default App