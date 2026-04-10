from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
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

model = EncodecModel.encodec_model_24khz()
model.set_target_bandwidth(6.0)
model.eval()

@app.get("/")
def home():
    return {"message": "server a is running"}

@app.post("/encode-audio")
async def encode_audio(file: UploadFile = File(...)):
    # save file (already 24khz from frontend)
    raw_bytes = await file.read()
    input_path = file.filename
    with open(input_path, "wb") as f:
        f.write(raw_bytes)

    # read audio
    audio, sr = sf.read(input_path)
    print(f"received audio — shape: {audio.shape}, sr: {sr}")

    # encodec expects [1, 1, T]
    audio_tensor = torch.tensor(audio, dtype=torch.float32).unsqueeze(0).unsqueeze(0)

    # encode
    with torch.no_grad():
        frames = model.encode(audio_tensor)

    codes = frames[0][0].squeeze(0).cpu().numpy()
    print(f"codes shape: {codes.shape}")

    # send to server b
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "http://127.0.0.1:8001/decode-audio",
            json={"codes": codes.tolist()}
        )

    return {
        "file": input_path,
        "codes_shape": str(codes.shape),
        "server_b": resp.json()
    }