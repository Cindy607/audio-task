import torch
from torch import nn
from encodec.modules import lstm
from encodec import EncodecModel

# zevendesoje SLSTM me shtresa linear te thjeshta
class SimpleLSTM(nn.Module):
    def __init__(self, dimension, num_layers=2, skip=True):
        super().__init__()
        self.skip = skip
        # perdorim linear + tanh ne vend te LSTM
        self.layers = nn.Sequential(
            nn.Linear(dimension, dimension),
            nn.Tanh(),
            nn.Linear(dimension, dimension),
            nn.Tanh()
        )

    def forward(self, x):
        # x eshte [batch, channels, time]
        x_perm = x.permute(0, 2, 1)  # [batch, time, channels]
        y = self.layers(x_perm)
        y = y.permute(0, 2, 1)  # kthehu ne [batch, channels, time]
        if self.skip:
            y = y + x
        return y

lstm.SLSTM = SimpleLSTM

model = EncodecModel.encodec_model_24khz()
model.set_target_bandwidth(6.0)
model.eval()

dummy = torch.randn(1, 1, 24000)

torch.onnx.export(
    model.encoder,
    dummy,
    "encodec_encoder.onnx",
    opset_version=11,
    dynamic_axes={"input": {2: "time"}},
    do_constant_folding=True
)

print("u exportua!")