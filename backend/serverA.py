from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import soundfile as sf
import torch
import httpx
import numpy as np
from encodec import EncodecModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load the model once at startup
model = EncodecModel.encodec_model_24khz()
model.set_target_bandwidth(6.0)
model.eval()

@app.get("/")
def home():
    return {"message": "server a is running"}

@app.post("/encode-audio")
async def encode_audio(file: UploadFile = File(...)):
    # save the uploaded file first
    raw_bytes = await file.read()
    input_path = file.filename
    with open(input_path, "wb") as f:
        f.write(raw_bytes)

    # convert to 24khz mono wav using ffmpeg
    wav_path = "input_24k.wav"
    subprocess.run([
        r"C:\ffmpeg\bin\ffmpeg.exe", "-y",
        "-i", input_path,
        "-ar", "24000",
        "-ac", "1",
        wav_path
    ], check=True)

    # read the wav
    audio, sr = sf.read(wav_path)
    print(f"audio shape: {audio.shape}, sr: {sr}")

    # encodec expects shape [batch, channels, time]
    audio_tensor = torch.tensor(audio, dtype=torch.float32)
    audio_tensor = audio_tensor.unsqueeze(0).unsqueeze(0)  # [1, 1, T]

    # encode
    with torch.no_grad():
        frames = model.encode(audio_tensor)

    # frames[0][0] has shape [1, 8, T] — we want [8, T]
    codes = frames[0][0].squeeze(0).cpu().numpy()
    print(f"codes shape: {codes.shape}")

    # send codes to server b
    codes_list = codes.tolist()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "http://127.0.0.1:8001/decode-audio",
            json={"codes": codes_list}
        )

    return {
        "file": input_path,
        "codes_shape": str(codes.shape),
        "server_b": resp.json()
    }