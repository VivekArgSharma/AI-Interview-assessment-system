"""
PRISM Voice Delivery Model Trainer (PRD Section 7.2)
Trains delivery regressors mapping acoustic prosody features to delivery fluency scores.
"""

import os
import json
import torch
import torch.nn as nn
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

class VoiceDeliveryModel(nn.Module):
    def __init__(self, input_dim: int = 7):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.LayerNorm(32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1)
        )

    def forward(self, x):
        return self.net(x)

def train_voice_model(
    data_path: str = "ml/data/interview_dataset.json",
    save_path: str = "ml/checkpoints/voice_scorer_head.pt",
    epochs: int = 20
):
    if not os.path.exists(data_path):
        from generate_dataset import generate_multimodal_dataset
        generate_multimodal_dataset(data_path)

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Extract acoustic feature matrix
    feature_matrix = []
    targets = []
    for d in data:
        af = d["acoustic_features"]
        feats = [
            af["speaking_rate_wpm"],
            af["articulation_rate_wpm"],
            af["pause_count"],
            af["total_pause_seconds"],
            af["filler_count"],
            af["pitch_mean_hz"],
            af["pitch_std_hz"]
        ]
        # Target delivery score derived from rate optimality and filler absence
        rate_optimal = 1.0 - min(abs(af["speaking_rate_wpm"] - 140.0) / 60.0, 1.0)
        filler_penalty = min(af["filler_count"] * 0.2, 1.5)
        deliv_score = np.clip(4.5 * rate_optimal - filler_penalty + 1.0, 1.0, 5.0)

        feature_matrix.append(feats)
        targets.append(deliv_score)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(feature_matrix)

    X_train, X_val, y_train, y_val = train_test_split(X_scaled, targets, test_size=0.2, random_state=42)

    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1)
    X_val_t = torch.tensor(X_val, dtype=torch.float32)
    y_val_t = torch.tensor(y_val, dtype=torch.float32).unsqueeze(1)

    model = VoiceDeliveryModel(input_dim=7)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.005)
    criterion = nn.MSELoss()

    print("\n--- Training Voice Delivery Prosody Regressor ---")
    model.train()
    for ep in range(1, epochs + 1):
        optimizer.zero_grad()
        preds = model(X_train_t)
        loss = criterion(preds, y_train_t)
        loss.backward()
        optimizer.step()

        if ep % 5 == 0 or ep == epochs:
            model.eval()
            with torch.no_grad():
                val_preds = model(X_val_t)
                val_mae = torch.mean(torch.abs(val_preds - y_val_t)).item()
            print(f"Epoch {ep:02d}/{epochs:02d} | Train Loss: {loss.item():.4f} | Val MAE: {val_mae:.3f}")
            model.train()

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    torch.save({"model_state": model.state_dict(), "scaler_mean": scaler.mean_.tolist(), "scaler_scale": scaler.scale_.tolist()}, save_path)
    print(f"\n[OK] Saved trained voice prosody model to {save_path}")

if __name__ == "__main__":
    train_voice_model()
