import torch
from encodec import EncodecModel

model = EncodecModel.encodec_model_24khz()
model.eval()

dummy = torch.randn(1, 1, 24000)

torch.onnx.export(
    model.encoder,
    dummy,
    "encodec_encoder.onnx",
    opset_version=14,
    dynamic_axes={"input": {2: "time"}}
)
print("done")