import { useState } from "react"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"
import "./App.css"

// load ffmpeg once, not inside component
const ffmpeg = new FFmpeg()

function App() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!file) {
      setError("pick a file first")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      // load ffmpeg in the browser (only first time)
      if (!ffmpeg.loaded) {
        setStatus("loading ffmpeg in browser...")
        await ffmpeg.load()
      }

      // convert audio to 24khz mono using ffmpeg.wasm (runs in browser)
      setStatus("converting to 24khz...")
      await ffmpeg.writeFile("input", await fetchFile(file))
      await ffmpeg.exec(["-i", "input", "-ar", "24000", "-ac", "1", "output.wav"])

      // read the converted file and make it a blob
      const converted = await ffmpeg.readFile("output.wav")
      const wavBlob = new Blob([converted.buffer], { type: "audio/wav" })
      const wavFile = new File([wavBlob], "audio_24k.wav", { type: "audio/wav" })

      console.log("converted to 24khz, size:", wavBlob.size)

      // send to server a
      setStatus("sending to server...")
      const form = new FormData()
      form.append("file", wavFile)

      const res = await fetch("http://127.0.0.1:8000/encode-audio", {
        method: "POST",
        body: form
      })
      const data = await res.json()
      console.log("response from server:", data)
      setResult(data)
      setStatus("")

    } catch (err) {
      console.error(err)
      setError("something went wrong, check the console")
      setStatus("")
    }

    setLoading(false)
  }

  return (
    <div className="wrapper">
      <h2>Audio Task</h2>
      <p>upload audio → ffmpeg converts in browser → server a encodes → server b decodes</p>

      <input
        type="file"
        accept="audio/*"
        onChange={e => setFile(e.target.files[0])}
      />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? status : "send"}
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