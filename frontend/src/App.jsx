import { useState } from "react"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"
import { pipeline } from "@xenova/transformers"
import "./App.css"

const ffmpeg = new FFmpeg()
let encoder = null

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
      // konverto ne 24khz ne browser me ffmpeg
      if (!ffmpeg.loaded) {
        setStatus("loading ffmpeg...")
        await ffmpeg.load()
      }

      setStatus("converting to 24khz...")
      await ffmpeg.writeFile("input", await fetchFile(file))
      await ffmpeg.exec(["-i", "input", "-ar", "24000", "-ac", "1", "output.wav"])
      const converted = await ffmpeg.readFile("output.wav")

      // lexo skedarin e konvertuar dhe beje blob qe ta dergojme
      const wavBlob = new Blob([converted.buffer], { type: "audio/wav" })
      console.log("converted to 24khz, size:", wavBlob.size)

      // cargo encodec modelin nga hugging face
      if (!encoder) {
        setStatus("loading encodec model...")
        console.log("loading model...")
        try {
          const { AutoModel, AutoProcessor } = await import("@xenova/transformers")
          const processor = await AutoProcessor.from_pretrained("Xenova/encodec_24khz")
          const model = await AutoModel.from_pretrained("Xenova/encodec_24khz")
          encoder = { processor, model }
          console.log("model loaded!")
        } catch(modelErr) {
          console.error("model loading failed:", modelErr)
          throw modelErr
        }
      }

      // enkodo ne browser
      setStatus("encoding in browser...")
      console.log("starting encoding...")
      const audioContext = new AudioContext({ sampleRate: 24000 })
      const arrayBuffer = await wavBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const audioData = audioBuffer.getChannelData(0)
      console.log("audio data ready, length:", audioData.length)

      const inputs = await encoder.processor(audioData, { sampling_rate: 24000 })
      const output = await encoder.model(inputs)
      console.log("encoded output:", output)
      console.log("type:", typeof output)
      console.log("keys:", Object.keys(output))

      // dergo vetem numrat te server b
      setStatus("sending codes to server...")
      const res = await fetch("http://127.0.0.1:8001/decode-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: output })
      })
      const data = await res.json()
      console.log("response:", data)
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
      <p>upload audio → ffmpeg 24khz → encodec ne browser → server b dekodo</p>

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
          <p><b>saved as:</b> {result.saved}</p>
          <p><b>duration:</b> {result.duration_sec}s</p>
        </div>
      )}
    </div>
  )
}

export default App