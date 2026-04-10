from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import torch
import numpy as np
import soundfile as sf
import subprocess
from encodec import EncodecModel

app = FastAPI()

model = EncodecModel.encodec_model_24khz()
model.set_target_bandwidth(6.0)
model.eval()

class CodeInput(BaseModel):
    codes: List[List[int]]  # should be [8, N]

@app.get("/")
def home():
    return {"message": "server b is running"}

@app.post("/decode-audio")
def decode_audio(data: CodeInput):
    # convert back to tensor — encodec wants [1, 8, T]
    codes_np = np.array(data.codes, dtype=np.int64)
    codes_tensor = torch.tensor(codes_np).unsqueeze(0)  # [1, 8, T]
    print(f"received codes shape: {codes_tensor.shape}")

    # decode — model.decode expects list of (codes, scale)
    frames = [(codes_tensor, None)]
    with torch.no_grad():
        decoded = model.decode(frames)  # [1, 1, T]

    audio_out = decoded.squeeze().cpu().numpy()

    # save at 24khz first
    sf.write("decoded_24k.wav", audio_out, 24000)

    # then resample to 22050hz
    subprocess.run([
        r"C:\ffmpeg\bin\ffmpeg.exe", "-y",
        "-i", "decoded_24k.wav",
        "-ar", "22050",
        "decoded_22050.wav"
    ], check=True)

    final, _ = sf.read("decoded_22050.wav")

    return {
        "status": "done",
        "saved": "decoded_22050.wav",
        "duration_sec": round(len(final) / 22050, 2)
    }